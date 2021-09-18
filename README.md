# homebridge-anthemreceiver

Homebridge Power and Input controller for Anthem AV Receiver. By default, the plugin will create one control for each zone on the receiver. 

![Screenshot](AR.png)

# Supported models

- MRX 310, MRX 510, MRX 710
- MRX 520, MRX 720, MRX 1120
- MRX 540, MRX 740, MRX 1140 (tested)
- AVM 60,  AVM 70,  AVM 90

# Getting started

- Install Homebridge
- Enable Connected Standby option on receiver (System setup -> General - General Setting)
- Installl homebridge-anthemreceiver plugin
- Configure by filling config.json or using Homebridge UI
- Restart Homebridge server
- Accessory is configured as an external accessory. It needs to be added manually afterward in Home app. See procedure below. 

# Configuration options

* `Host`: IP address or hostname of Anthem receiver
* `Port`: Default to 14999, use value set up in receiver

Zone1 and Zone2 options:
- Active: Show or hide accessory in Home App.
- Name: Accessory name in Home App. 

```
{
    "platform": "AnthemReceiver",
    "Host": "192.168.1.*",
    "Port": 14999,
    "Zone1": {
        "Active": true,
        "Name": "Zone1"
    },
    "Zone2": {
        "Active": true,
        "Name": "Zone2"
    }   
}
```

# Adding accessory to Home App

- Open Home App
- Select "+" on the right upper corner of the screen
- Select "I don't have a Code or Cannot Scan"
- Select unconfigured accessory to be added.
- Follow further on screen instructions to complete configuration

# 0.1.5

- Adding support for Apple Remote in Control Center

- UP:
- DOWN: 
- UP and DOWN physical volume buttons to change volume
- PLAY AND PAUSE to toggle mute
- LEFT, RIGHT to select input (Main Zone)
- CENTER button so select option (Main Zone)
- BACK button to toggle audio listening mode (Main Zone)
- INFO button to show and hide menu display (Main Zone)

# Known issues

- Homebridge needs to be restarted if inputs are added or removed on the Receiver 
- Model series X10 and X20 only support 9 inputs on this controller. 


