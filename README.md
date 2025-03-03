# Homebridge Airthings

`homebridge-airthings` is a plugin for [Homebridge](https://homebridge.io) that integrates with Airthings devices to monitor Radon levels in your home. *Currently, it only supports Airthings Wave 2*.
## Features
- Automatically detects Airthings devices without needing the serial number or MAC address.
- Compatible with Homebridge V2 as a dynamic platform.
- Connects to devices using Bluetooth (noble), no hub or API required.

## Installation

1. Install Homebridge using the [official instructions](https://github.com/homebridge/homebridge/wiki).
2. Install the `@drchai/homebridge-airthings` plugin using npm:
  ```sh
  npm install -g @drchai/homebridge-airthings
  ```
3. Update your Homebridge `config.json` file to include the plugin configuration:
  ```json
  {
    "platforms": [
     {
      "platform": "Airthings",
      "name": "Airthings", 
      "scanTime": 60, // Optional
      "refreshTime": 3600, // Optional
      "retryAfter": 30 // Optional
     }
    ]
  }
  ```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.