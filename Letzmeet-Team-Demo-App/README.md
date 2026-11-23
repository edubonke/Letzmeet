# Letzmeet Team Demo App

This is a self-contained Expo/React Native demonstration of the Letzmeet mobile
experience. It uses fictional profiles and local in-memory interactions so it
can be shown without deploying the Core API, authentication service, databases,
messaging service, or Privacy Vault.

## What the demo includes

- Welcome and privacy-first onboarding
- Fictional South African discovery profiles
- Like, pass and match interactions
- Working demonstration conversations
- Community posts and reactions
- Blocking, reporting and safe-date check-in demonstrations
- Profile, disclosure and language preferences
- Clear demo-mode labelling

## Run without administrator access

1. Upload this folder to a private GitHub repository.
2. Open the repository in GitHub Codespaces.
3. Run:

   ```bash
   npm install
   npm run start:tunnel
   ```

4. Install Expo Go on the demonstration phone.
5. Scan the QR code shown in the Codespaces terminal.
6. Keep the Codespace running during the presentation.

## Create a temporary Android APK

From the project folder in GitHub Codespaces:

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview
```

Allow Expo to generate the Android signing key. When the build completes, Expo
provides an installation link that can be shared with the team.

## Important limitation

This package is a demonstration, not a production release. Data resets when the
app restarts. It must not be used to collect real health disclosures, identity
information, locations, reports, messages, or photographs. Production use
requires the approved Letzmeet backend, Privacy Vault, moderation operations,
POPIA review, security testing and app-store compliance work.
