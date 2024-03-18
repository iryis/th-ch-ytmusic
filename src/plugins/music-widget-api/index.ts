import { createPlugin } from '@/utils';
import backend from './backend';

export interface MusicWidgetConfig {
  enabled: boolean,
}

export const defaultConfig: MusicWidgetConfig = {
  enabled: false,
};


export default createPlugin({
  name: () => 'Music Widget API',
  description: () => 'Simple API to query YTMusic data. Support for anything that querying ytmdesktop v1',
  restartNeeded: true, // if value is true, ytmusic show restart dialog
  config: defaultConfig,
  backend,
});
