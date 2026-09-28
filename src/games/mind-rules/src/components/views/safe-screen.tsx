import React from 'react';
import { ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SafeAreaProps = ViewProps & {
  children?: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
};

const SafeScreenView: React.FC<SafeAreaProps> = ({
  children,
  style,
  edges = ['top', 'bottom'],
  ...rest
}) => {
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1 }, style]} {...rest}>
      {children}
    </SafeAreaView>
  );
};

export default SafeScreenView;
