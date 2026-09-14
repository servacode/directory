import { Linking } from 'react-native';
export class PhoneActionService {
  async dial(phone:string):Promise<boolean>{const url=`tel:${phone.replace(/[^+\d]/g,'')}`;if(!(await Linking.canOpenURL(url)))return false;await Linking.openURL(url);return true;}
}
