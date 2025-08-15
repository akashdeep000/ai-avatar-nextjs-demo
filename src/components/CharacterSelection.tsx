import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Character } from './AIAvatar';

interface CharacterSelectionProps {
    characters: Character[];
    onCharacterSelected: (character: Character) => void;
}

const CharacterSelection: React.FC<CharacterSelectionProps> = ({ characters, onCharacterSelected }) => {
    return (
        <div className="flex flex-wrap justify-center gap-4 p-4">
            {characters.map((char) => (
                <Card key={char.id} className="w-64">
                    <CardHeader>
                        <CardTitle>{char.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => onCharacterSelected(char)} className="w-full">
                            Select
                        </Button>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default CharacterSelection;