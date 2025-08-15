"use client";

import { useEffect, useState } from "react";
import { AIAvatarProvider } from "./AIAvatar/AIAvatarProvider";

interface ClientAIAvatarProviderProps {
    children: React.ReactNode;
    backendUrl: string;
}

export const ClientAIAvatarProvider: React.FC<ClientAIAvatarProviderProps> = ({ children, backendUrl }) => {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    return (
        <>
            {isClient && (
                <AIAvatarProvider backendUrl={backendUrl}>
                    {children}
                </AIAvatarProvider>
            )}
        </>
    );
};