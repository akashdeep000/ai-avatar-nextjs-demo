# AI Avatar Integration Guide for Next.js

This guide explains how to integrate the AI Avatar into a new Next.js application.

## Step 1: Add Live2D Web SDK

1.  Copy the `Live2dWebSDK` directory from this repository into the root of your Next.js application. This SDK is required for the Live2D avatar rendering.

## Step 2: Configure TypeScript

1.  Open your `tsconfig.json` file and add the following `paths` to the `compilerOptions`:

    ```json
    "paths": {
      "@/*": ["./src/*"],
      "@framework/*": ["./Live2dWebSDK/Framework/dist/*"],
      "@cubismsdksamples/*": ["./Live2dWebSDK/src/*"]
    }
    ```

2.  Add `"Live2dWebSDK"` to the `exclude` array in `tsconfig.json` to prevent TypeScript from checking the SDK's files, which can cause unnecessary errors.

    ```json
    "exclude": ["node_modules", "Live2dWebSDK"]
    ```

## Step 3: Configure NPM Scripts

In your `package.json` file, add a script to build the Live2D Web SDK and modify your `dev` and `build` scripts to run it automatically.

```json
"scripts": {
  "build-web-sdk": "cd Live2dWebSDK/Framework && npm install && npm run build",
  "dev": "npm run build-web-sdk && next dev",
  "build": "npm run build-web-sdk && next build",
  "start": "next start",
  "lint": "next lint"
},
```

## Step 4: Add Public Assets

1.  Copy the contents of the `Live2dWebSDK/Core` directory into your `public/live2d` directory. This contains the core files for the Live2D SDK that need to be served publicly.

## Step 5: Add AI Avatar Components

1.  Copy the entire `src/components/AIAvatar` directory into your `src/components` directory.

## Step 6: Install Dependencies

You will need to install the following dependencies:

```bash
npm install @ricky0123/vad-react uuid
```

## Step 7: Review and Adapt UI Components

The following files provide the main structure and UI for the AI Avatar. It is recommended to review these files and adapt them to your application's specific requirements, as a generic guide may not fit all use cases.

- **[`src/app/layout.tsx`](src/app/layout.tsx):** This file sets up the global layout and fonts. It is crucial for two reasons:

  1.  It includes `<Script src="/live2d/Core/live2dcubismcore.js" strategy="lazyOnload" />` which loads the core Live2D library required for the avatar to function. The `lazyOnload` strategy ensures it doesn't block the initial page load.
  2.  It wraps the application in the `ClientAIAvatarProvider`, which provides the AI Avatar context to all components.
      You may need to adjust this file to fit your existing layout, but ensure these two elements are present.

- **[`src/components/AIAvatarProviderClientWraper.tsx`](src/components/AIAvatarProviderClientWraper.tsx):** This is a client-side wrapper to ensure the `AIAvatarProvider` only renders on the client, which is necessary for its hooks and context to function correctly. For better performance, it's recommended to place this provider as deep as possible in your component tree, only wrapping the components that need access to the AI Avatar context.

- **[`src/app/page.tsx`](src/app/page.tsx):** This is the entry point of the application's UI. It handles fetching the available characters and displaying the `CharacterSelection` component or the `MainView` based on whether a character has been selected.

> [!WARNING]
> If you are using my provided [`src/components/CharacterSelection.tsx`](src/components/CharacterSelection.tsx) or [`src/components/Chat.tsx`](src/components/Chat.tsx) components, you have to either setup required shadcn components or modify them to fit your application's design.

- **[`src/components/CharacterSelection.tsx`](src/components/CharacterSelection.tsx):** This component renders the UI for selecting a character. You can customize its appearance and behavior.

- **[`src/components/MainView.tsx`](src/components/MainView.tsx):** This component arranges the `AIAvatarCanvas` and the `Chat` component into the main view. You can change this layout to suit your design.

- **[`src/components/Chat.tsx`](src/components/Chat.tsx):** This is the chat interface. You can modify this component to change the look and feel of the chat, or to add, remove, or change UI elements like the recording mode selector or the continuous listening checkbox.
