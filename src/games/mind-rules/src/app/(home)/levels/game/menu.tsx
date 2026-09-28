import { Icon } from '@/src/components/icons';
import { Button, Menu } from 'heroui-native';
import React from 'react';

type GameMenuProps = {
  onRestart?: () => void;
  onHowToPlay?: () => void;
  onQuit?: () => void;
};

/** Options menu for the in-progress game (restart / how to play / quit). */
const GameMenu: React.FC<GameMenuProps> = ({
  onRestart,
  onHowToPlay,
  onQuit,
}) => {
  return (
    <Menu>
      <Menu.Trigger asChild>
        <Button isIconOnly size="sm" variant="ghost" className="rounded-full">
          <Icon.Menu
            size={18}
            className="text-muted"
          />
        </Button>
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Overlay />
        <Menu.Content presentation="popover" width={200}>
          <Menu.Item onPress={onRestart}>
            <Icon.Refresh
              size={18}
              className="text-default-foreground"
            />
            <Menu.ItemTitle>Restart</Menu.ItemTitle>
          </Menu.Item>

          <Menu.Item onPress={onHowToPlay}>
            <Icon.Question
              size={18}
              className="text-default-foreground"
            />
            <Menu.ItemTitle>How to play</Menu.ItemTitle>
          </Menu.Item>

          <Menu.Item variant="danger" onPress={onQuit}>
            <Icon.Exit size={18} className="text-danger" />
            <Menu.ItemTitle>Quit</Menu.ItemTitle>
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu>
  );
};

export default GameMenu;
