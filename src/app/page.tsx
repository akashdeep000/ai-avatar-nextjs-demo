"use client";

import { useAIAvatar } from "@/components/AIAvatar";
import CharacterSelection from "@/components/CharacterSelection";
import MainView from "@/components/MainView";
import { useEffect } from "react";

export default function Home() {
  const { characters, character, selectCharacter, fetchCharacters } = useAIAvatar();

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  if (!character) {
    return <CharacterSelection characters={characters} onCharacterSelected={(char) => selectCharacter(char.id)} />;
  }

  return (
    <div className="h-svh">
      <MainView />
    </div>
  );
}
