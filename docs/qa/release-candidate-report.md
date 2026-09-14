# Release Candidate Report

## Source scope

The source now contains a configurable province directory platform. The initial Raqqa release intentionally exposes Pharmacy + Pharmacy Duty only, while Admin can later activate preconfigured or generic categories per governorate.

Implemented source paths include dynamic grouped discovery, owner registration/resume/management, configurable private verification, secure facility images, map-based location, business hours, temporary closures, pharmacy duty, ratings, account/profile/password recovery and the lightweight Admin Web.

## RC rule

The source RC must pass the dynamic-directory migration audit in addition to the original security, reliability and centralization gates. Final RC approval still requires real dependency builds, live PostgreSQL/PostGIS and Android device verification.
