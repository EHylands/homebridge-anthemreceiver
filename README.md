# homebridge-anthemreceiver

Homebridge Power and Input controller for Anthem AV Receiver. By default, the plugin will create one control for each zone on the receiver. 

# Supported models

- MRX 310, MRX 510, MRX 710
- MRX 520, MRX 720, MRX 1120
- MRX 540, MRX 740, MRX 1140 (tested)

# Getting started

- Install Hombebridge
- Enable Connected Standby option on receiver (System setup -> General - General Setting)
- Installl homebridge-anthemreceiver plugin
- Configure by filling config.json or using Homebridge UI
- Restart Homebridge server
- Accessory is configured as an external accessory. It needs to be added manually afterward in Home app. See procedure below. 

# Configuration options

Please see config.json.sample
- Host: IP address or hostname of Anthem receiver
- Port: Default to 14999, use value set up in receiver

Zone1 and Zone2 options:
- Active: Show or hide accessory in Home app.
- Name: Accessory name in Home app. 

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

# Adding accessory to Home App

- Open Home App
- Select "+" on the right upper corner of the screen
- Select "I don't have a Code or Cannot Scan"
- Select unconfigured accessory to be added.
- Follow further on screen instructions to complete configuration

# 0.1.2

- Added support for Apple Remote in control center

- UP and DOWN to control volume
- PLAY AND PAUSE to toggle mute
- LEFT, RIGHT and CENTER to select input (Zone 1)
- CENTER button so select option (Zone 1)
- BACK button to toggle audio listening mode (Zone 1)
- INFO button to show and hide menu display (Zone 1)

# To do list

- Test on other models (only tested on MRX 740) 
- Add other accessory to control orther receiver functions (Mute, Volume, etc.)

# Known issues

- Homebridge needs to ne restarted if Inputs are added or removed on the Receiver 
- Model series before X10 and X20 only support 9 inputs in this controller. 

Last update: 2021-09-03 

