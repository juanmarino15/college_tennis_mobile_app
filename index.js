/**
 * @format
 */

import {AppRegistry} from 'react-native';

// Keep release builds quiet: routine logs only matter while developing.
// console.warn/console.error still go through.
if (!__DEV__) {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
}
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
