import { registerRootComponent } from 'expo';
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';

function Root() {
  const [AppComponent, setAppComponent] = useState<React.ComponentType | null>(null);
  const [startupError, setStartupError] = useState<unknown>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      if (Platform.OS === 'web') {
        const { LoadSkiaWeb } = await import('@shopify/react-native-skia/lib/module/web');
        await LoadSkiaWeb({ locateFile: () => '/canvaskit.wasm' });
      }

      const { default: App } = await import('./App');
      if (active) setAppComponent(() => App);
    })().catch(error => {
      console.error('Không thể khởi tạo ứng dụng.', error);
      if (active) setStartupError(error);
    });

    return () => { active = false; };
  }, []);

  if (startupError) throw startupError;
  return AppComponent ? React.createElement(AppComponent) : null;
}

registerRootComponent(Root);
