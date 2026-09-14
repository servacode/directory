import { createHash } from 'node:crypto';
import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  changePasswordRequestSchema,
  loginRequestSchema,
  passwordRecoveryCompleteRequestSchema,
  passwordRecoveryStartRequestSchema,
  passwordRecoveryVerifyRequestSchema,
  refreshTokenRequestSchema,
  registerRequestSchema,
} from '@health/contracts';
import { AuthApplicationService } from '../auth-application.service.js';
import { PasswordRecoveryApplicationService } from '../password-recovery-application.service.js';
import type { AuthenticatedPrincipal } from '../core/ports.js';
import { AccessTokenGuard } from './access-token.guard.js';
import { CurrentPrincipal } from './current-principal.decorator.js';
import { SecurityThrottleService } from '../../../security/security-throttle.service.js';
import { AuthDomainError } from '../core/auth-error.js';
import { normalizeSyrianMobile } from '../core/phone-normalizer.js';
import { PlatformSettingsService } from '../../settings/platform-settings.service.js';

function metadata(request: Request) {
  const deviceName = request.header('user-agent')?.slice(0, 160);
  const devicePlatform = request.header('x-device-platform')?.slice(0, 80);
  const appVersion = request.header('x-app-version')?.slice(0, 40);
  return { ...(deviceName ? { deviceName } : {}), ...(devicePlatform ? { devicePlatform } : {}), ...(appVersion ? { appVersion } : {}) };
}
function ip(request:Request):string{return request.ip || request.socket.remoteAddress || 'unknown';}
function secretRateKey(value:string):string{return createHash('sha256').update(value).digest('hex').slice(0,24);}

function assertAdminBrowserOrigin(request:Request):void{
  if(process.env.NODE_ENV!=='production')return;
  const origin=request.header('origin');
  const allowed=(process.env.CORS_ORIGINS??'').split(',').map(v=>v.trim()).filter(Boolean);
  if(!origin||!allowed.includes(origin))throw new AuthDomainError('UNAUTHORIZED','Invalid admin origin.');
}
const ADMIN_REFRESH_COOKIE='directory_admin_refresh';
const ADMIN_COOKIE_PATH='/api/v1/auth/admin';
function readCookie(request:Request,name:string):string|undefined{
  const raw=request.header('cookie');if(!raw)return undefined;
  for(const part of raw.split(';')){const [key,...value]=part.trim().split('=');if(key===name)return decodeURIComponent(value.join('='));}
  return undefined;
}
function setAdminRefreshCookie(response:Response,refreshToken:string,expiresAt:string):void{
  response.cookie(ADMIN_REFRESH_COOKIE,refreshToken,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:ADMIN_COOKIE_PATH,expires:new Date(expiresAt)});
}
function clearAdminRefreshCookie(response:Response):void{
  response.clearCookie(ADMIN_REFRESH_COOKIE,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:ADMIN_COOKIE_PATH});
}
function adminAuthResponse(data:Awaited<ReturnType<AuthApplicationService['loginAdmin']>>){return{user:data.user,accessToken:data.tokens.accessToken,accessTokenExpiresAt:data.tokens.accessTokenExpiresAt};}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthApplicationService,
    private readonly recovery: PasswordRecoveryApplicationService,
    private readonly throttle: SecurityThrottleService,
    private readonly settings: PlatformSettingsService,
  ) {}

  @Post('admin/login') async adminLogin(@Body() body:unknown,@Req() request:Request,@Res({passthrough:true}) response:Response){
    assertAdminBrowserOrigin(request);
    const input=loginRequestSchema.parse(body);
    this.throttle.assert('admin-login',`${ip(request)}:${normalizeSyrianMobile(input.phone)}`,{limit:8,windowMs:15*60_000});
    const data=await this.auth.loginAdmin(input,metadata(request));
    setAdminRefreshCookie(response,data.tokens.refreshToken,data.tokens.refreshTokenExpiresAt);
    return adminAuthResponse(data);
  }

  @Post('admin/refresh') async adminRefresh(@Req() request:Request,@Res({passthrough:true}) response:Response){
    assertAdminBrowserOrigin(request);
    const refreshToken=readCookie(request,ADMIN_REFRESH_COOKIE);
    if(!refreshToken)throw new AuthDomainError('INVALID_REFRESH_TOKEN','Invalid refresh token.');
    this.throttle.assert('admin-refresh',`${ip(request)}:${secretRateKey(refreshToken)}`,{limit:60,windowMs:15*60_000});
    const data=await this.auth.refresh(refreshToken);
    if(data.user.systemRole!=='ADMIN')throw new AuthDomainError('UNAUTHORIZED','Invalid credentials.');
    setAdminRefreshCookie(response,data.tokens.refreshToken,data.tokens.refreshTokenExpiresAt);
    return adminAuthResponse(data);
  }

  @UseGuards(AccessTokenGuard)
  @Post('admin/logout') async adminLogout(@CurrentPrincipal() principal:AuthenticatedPrincipal,@Res({passthrough:true}) response:Response):Promise<{ok:true}>{
    await this.auth.logout(principal.sessionId);clearAdminRefreshCookie(response);return{ok:true};
  }

  @Post('register') register(@Body() body: unknown, @Req() request: Request) {
    const input=registerRequestSchema.parse(body);
    this.throttle.assert('register',`${ip(request)}:${normalizeSyrianMobile(input.phone)}`,{limit:5,windowMs:15*60_000});
    return this.auth.register(input, metadata(request));
  }

  @Post('login') login(@Body() body: unknown, @Req() request: Request) {
    const input=loginRequestSchema.parse(body);
    this.throttle.assert('login',`${ip(request)}:${normalizeSyrianMobile(input.phone)}`,{limit:10,windowMs:15*60_000});
    return this.auth.login(input, metadata(request));
  }

  @Post('refresh') refresh(@Body() body: unknown, @Req() request:Request) {
    const input = refreshTokenRequestSchema.parse(body);
    this.throttle.assert('refresh',`${ip(request)}:${secretRateKey(input.refreshToken)}`,{limit:60,windowMs:15*60_000});
    return this.auth.refresh(input.refreshToken);
  }

  @UseGuards(AccessTokenGuard)
  @Post('logout') async logout(@CurrentPrincipal() principal: AuthenticatedPrincipal): Promise<{ ok: true }> {
    await this.auth.logout(principal.sessionId); return { ok: true };
  }

  @UseGuards(AccessTokenGuard)
  @Post('logout-all') async logoutAll(@CurrentPrincipal() principal: AuthenticatedPrincipal): Promise<{ ok: true }> {
    await this.auth.logoutAll(principal.userId); return { ok: true };
  }

  @UseGuards(AccessTokenGuard)
  @Post('change-password') changePassword(@CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() body: unknown) {
    this.throttle.assert('change-password',principal.userId,{limit:5,windowMs:60*60_000});
    return this.auth.changePassword(principal.userId, principal.sessionId, changePasswordRequestSchema.parse(body));
  }

  @Post('password-recovery/start') async startRecovery(@Body() body: unknown, @Req() request:Request) {
    if(!(await this.settings.get('passwordRecoveryEnabled')))throw new AuthDomainError('FEATURE_DISABLED','Password recovery is disabled.');
    if(!process.env.WHATSAPP_RECOVERY_WEBHOOK_URL||!process.env.WHATSAPP_RECOVERY_WEBHOOK_TOKEN)throw new AuthDomainError('FEATURE_DISABLED','Password recovery channel is not configured.');
    const input = passwordRecoveryStartRequestSchema.parse(body);
    this.throttle.assert('recovery-start',`${ip(request)}:${normalizeSyrianMobile(input.phone)}`,{limit:5,windowMs:15*60_000});
    return this.recovery.start(input.phone);
  }

  @Post('password-recovery/verify') verifyRecovery(@Body() body: unknown, @Req() request:Request) {
    const input = passwordRecoveryVerifyRequestSchema.parse(body);
    this.throttle.assert('recovery-verify',`${ip(request)}:${input.challengeId}`,{limit:10,windowMs:15*60_000});
    return this.recovery.verify(input.challengeId, input.verificationCode);
  }

  @Post('password-recovery/complete') async completeRecovery(@Body() body: unknown, @Req() request:Request): Promise<{ ok: true }> {
    const input = passwordRecoveryCompleteRequestSchema.parse(body);
    this.throttle.assert('recovery-complete',`${ip(request)}:${input.challengeId}`,{limit:5,windowMs:15*60_000});
    await this.recovery.complete(input.challengeId, input.recoveryToken, input.newPassword);
    return { ok: true };
  }
}
