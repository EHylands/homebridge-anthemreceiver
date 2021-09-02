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
- Follow further on screen instruction to complete configuration

# To do list

- Test on other models (only tested on MRX 740) 
- Add other accessory to control orther receiver functions (Mute, Volume, etc.)

# Known issues


Last update: 2021-09-02 

