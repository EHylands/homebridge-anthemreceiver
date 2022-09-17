# homebridge-anthemreceiver
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
[![npm downloads](https://badgen.net/npm/dt/homebridge-anthemreceiver)](https://www.npmjs.com/package/homebridge-anthemreceiver)

Homebridge plugin for Anthem Receiver.
- Zone 1 and Zone 2 Power/Input accessories (External accessories to be manually added in Home App)
- Zone 1 and Zone 2 Power, Volume, Mute and Input accessories
- Zone 1 ARC and Audio Listenning Mode accessories
- Front Panel Brightness Accessory

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
- Configure plugin by using Homebridge UI interface
- Restart Homebridge server
- ARC, Power, Volume, Mute, Input, Panel Brightness and Audio Listenning Mode accessories will be added automatically if enabled. 
- Power/Input accessories are to be manually added in Home App. This step is needed for Apple Remote to be present in control center. See procedure below.

# Configuration options
* `Host`: IP address or hostname of Anthem receiver
* `Port`: Default to 14999, use value set up in receiver
* `Panel Brightness`: Control front panel brightness
* `Power`: Add Zone Power accessory (Toggle Zone on and off status)
* `Volume`: Add Zone Volume accessory (Toggle Zone mute status and control volume level)
* `Mute`: Add Zone Mute accessory (Toggle Zone mute status)
* `Input`: Add Zone Input accessory (Cycle Zone active input)
* `ARC`: Add Zone1 ARC accessory (Toggle Zone1 ARC status, ARC neends to be configured)
* `ALM`: Add Zone1 Audio Listenning Mode accessory (Cycle Zone1 Current Audio Mode)
* `Zone Power/Input`: Publish Zone External Power/Input accessory 
* `Name`: Zone External Power/Input accessory custom name. Defaults to "Zone1" and "Zone2"

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

# Known issues
- Zone needs to be powered off and on if inputs are added or removed on the receiver for changes to appear in HomeKit. If inputs are not visible under Power/Input Accessory, please kill and reopen Home App. 
- It takes a few seconds for the receiver to become responsive to HomeKit commands on startup even if the receiver reports being powered on in Homekit.