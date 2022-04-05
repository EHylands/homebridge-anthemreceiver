# homebridge-anthemreceiver
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
[![npm downloads](https://badgen.net/npm/dt/homebridge-anthemreceiver)](https://www.npmjs.com/package/homebridge-anthemreceiver)

Homebridge plugin for Anthem Receiver.
- Zone 1 and Zone 2 Power/Input accessories (External accessories to be manually added in Home App)
- Zone 1 and Zone 2 Power, Volume, Mute and Input accessories
- Zone 1 ARC and Audio Listenning Mode accessories

![Screenshot](0.5.1.jpg)

# Supported models
- AVM 60,  AVM 70,  AVM 90 
- MRX 310, MRX 510, MRX 710 
- MRX 520, MRX 720, MRX 1120 
- MRX 540, MRX 740, MRX 1140

# Getting started
- Install Homebridge and Homebridge UI
- Install homebridge-anthemreceiver plugin
- Enable Connected Standby option on Anthem Receiver (Web UI: System setup -> General -> General Setting)
- Configure plugin by filling config.json or by using Homebridge UI interface
- Restart Homebridge server
- ARC, Power, Volume, Mute, Input and Audio Listenning Mode accessories will be added automatically if enabled. 
- Power/Input accessories are to be manually added in Home App. This step is needed for Apple Remote to be present in control center. See procedure below.

# Configuration options
* `Host`: IP address or hostname of Anthem receiver
* `Port`: Default to 14999, use value set up in receiver
* `Active`: Publish Zone External Power/Input accessory 
* `Power`: Add Zone Power accessory (Toggle Zone on and off status)
* `Volume`: Add Zone Volume accessory (Toggle Zone mute status and control volume level)
* `Mute`: Add Zone Mute accessory (Toggle Zone mute status)
* `Input`: Add Zone Input accessory (Cycle Zone active input)
* `ARC`: Add Zone1 ARC accessory (Toggle Zone1 ARC status, ARC neends to be configured)
* `ALM`: Add Zone1 Audio Listenning Mode accessory (Cycle Zone1 Current Audio Mode)
* `Name`: Zone External Power/Input accessory custom name. Defaults to "Zone1" and "Zone2"


```
{
    "platform": "AnthemReceiver",
    "Host": "192.168.1.1",
    "Port": 14999,
    "Zone1": {
        "Name": "Zone1",
        "Active": true,
        "ARC": true,
        "Power": true,
        "Volume": true,
        "Mute": true,
        "Input": true,
        "ALM": true
    },
    "Zone2": {
        "Name": "Zone2",
        "Active": true,
        "Power": true,
        "Volume": true,
        "Input": true,
        "Mute": true
    }
}
```

# Adding External Power/Input accessory in Home App
## iOS 15
- Enable "Power/Input" accessory in config file or Homebridge UI. Restart Homebridge after any modifications
- Open Home App
- Select "+" on the right upper corner of the screen and select "Add Accessory"
- Select "More options"
- Select "Zone1" or "Zone2" Power/Input Television accessory
- Follow further on screen instructions to complete configuration

# Apple Remote in Control Center
* Device UP and DOWN physical volume buttons to change volume
* UP and DOWN to change volume
* PLAY AND PAUSE to toggle mute
* LEFT, RIGHT to select input (Main Zone)
* BACK button to switch curent audio mode (Main Zone)
* INFO button to show and hide menu display (Main Zone)
* CENTER button so select option (Main Zone)

# Releases
## 0.5.3
- Security fix

## 0.5.2
- Adding Volume accessory for Zone1 and Zone2 (Only available for X40 serie receiver)
- Adding ARC accessory for Zone1

## 0.5.0
- Adding Power, Mute and Input accessories for Zone1 and Zone2
- Adding Audio Listening Mode accessory for Zone1

## 0.4.0
* No changes to configuration file options.
* Controller now gracefully reconnect to receiver on connection lost or timeout without crashing the plugin.
* Better handling of different series protocol: X10, X20 and X40.
* Only able to test with MRX740. Please report success running the plugin on your model on Github project issues page (v0.4.0 Support thread).  

# Known issues
- Zone needs to be powered off and on if inputs are added or removed on the receiver for changes to appear in HomeKit. If inputs are not visible under Power/Input Accessory, please kill and reopen Home App. 
- It takes a few seconds for the receiver to become responsive to HomeKit commands on startup even if the receiver reports being powered on in Homekit.