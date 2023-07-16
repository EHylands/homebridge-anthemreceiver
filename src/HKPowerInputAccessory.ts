import { PlatformAccessory, Service } from 'homebridge';
import { AnthemController, AnthemKeyCode } from './AnthemController';
import { AnthemReceiverHomebridgePlatform } from './platform';
import { PLUGIN_NAME } from './settings';

export class HKPowerInputAccessory {
  private ReceiverAccessory: PlatformAccessory;
  private TVService: Service;
  private SpeakerService: Service;
  private HdmiInputService: Service[];

  constructor(
    private readonly platform: AnthemReceiverHomebridgePlatform,
    private readonly Controller: AnthemController,
    private readonly ZoneNumber: number,
  ) {

    const Name = this.Controller.GetZoneName(this.ZoneNumber);
    this.HdmiInputService = [];

    this.platform.log.info( 'Zone' + ZoneNumber + ': Power/Input');

    const uuid = this.platform.api.hap.uuid.generate('Anthem_Receiver' + this.Controller.ReceiverModel +
    this.Controller.SerialNumber + ZoneNumber);
    this.ReceiverAccessory = new this.platform.api.platformAccessory(Name, uuid);
    this.ReceiverAccessory.category = this.platform.api.hap.Categories.TELEVISION;

  // set accessory information
  this.ReceiverAccessory.getService(this.platform.Service.AccessoryInformation)!
    .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Anthem')
    .setCharacteristic(this.platform.Characteristic.Model, Controller.ReceiverModel)
    .setCharacteristic(this.platform.Characteristic.SerialNumber, Controller.SerialNumber)
    .setCharacteristic(this.platform.Characteristic.FirmwareRevision, Controller.SoftwareVersion);

  this.TVService = this.ConfigureTelevisionservice();
  this.SpeakerService = this.ConfigureTelevisionSpeakerService();

  this.Controller.on('ZonePowerChange', (Zone: number, Power: boolean) => {
    if(this.ZoneNumber === Zone){
      this.TVService.updateCharacteristic(this.platform.Characteristic.Active, Power);
    }
  });

  this.Controller.on('ZoneInputChange', (Zone: number, Input: number) => {
    if(this.ZoneNumber === Zone){
      this.TVService.updateCharacteristic(this.platform.Characteristic.ActiveIdentifier, Input);
    }
  });

  this.Controller.on('ZoneMutedChange', (Zone: number, Muted:boolean) => {
    if(this.ZoneNumber === Zone){
      this.SpeakerService.updateCharacteristic(this.platform.Characteristic.Mute, Muted);
    }
  });

  this.Controller.on('ZoneVolumePercentageChange', (Zone: number, VolumePercentage:number)=>{
    if(this.ZoneNumber === Zone){
      this.SpeakerService.updateCharacteristic(this.platform.Characteristic.Volume, VolumePercentage);
    }
  });

  this.platform.api.publishExternalAccessories(PLUGIN_NAME, [this.ReceiverAccessory]);
  }

  SetInputs(InputArray: string[]){
    for(let i = 0 ; i < this.HdmiInputService.length ; i++){
      this.TVService.removeLinkedService(this.HdmiInputService[i]);
      this.ReceiverAccessory.removeService(this.HdmiInputService[i]);
    }

    for (let i = 0; i < InputArray.length ; i++){
      const hdmiInputService = this.ReceiverAccessory.addService(this.platform.Service.InputSource, 'hdmi'+(i+1), 'HDMI '+ (i+1));
      hdmiInputService
        .setCharacteristic(this.platform.Characteristic.Identifier, (i+1))
        .setCharacteristic(this.platform.Characteristic.ConfiguredName, InputArray[i])
        .setCharacteristic(this.platform.Characteristic.IsConfigured, this.platform.Characteristic.IsConfigured.CONFIGURED)
        .setCharacteristic(this.platform.Characteristic.InputSourceType, this.platform.Characteristic.InputSourceType.HDMI);
      this.TVService.addLinkedService(hdmiInputService);
      this.HdmiInputService.push(hdmiInputService);
    }
  }

  ConfigureTelevisionservice():Service{
    const Name = this.Controller.GetZoneName(this.ZoneNumber);
    const TVService = this.ReceiverAccessory.addService(this.platform.Service.Television);
    TVService.setCharacteristic(this.platform.Characteristic.ConfiguredName, Name);
    TVService.setCharacteristic(this.platform.Characteristic.SleepDiscoveryMode,
      this.platform.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);

    // Send change from homekit to Anthem Receiver - Power
    TVService.getCharacteristic(this.platform.Characteristic.Active)
      .onSet((newValue) => {
        this.Controller.PowerZone(this.ZoneNumber, newValue === 1);
      });

    // Send change from homekit to Anthem Receiver - Active input
    TVService.getCharacteristic(this.platform.Characteristic.ActiveIdentifier)
      .onSet((newValue) => {
        this.Controller.SetZoneInput(this.ZoneNumber, Number(newValue));
      });

    TVService
      .getCharacteristic(this.platform.Characteristic.RemoteKey)
      .on('set', async (newValue, callback) => {
        if(!this.Controller.GetZones()[this.ZoneNumber].GetIsPowered()){
          this.Controller.PowerZone(this.ZoneNumber, true);
          callback();
          return;
        }

        switch (newValue) {
          case this.platform.Characteristic.RemoteKey.ARROW_UP: {
            if(this.Controller.GetIsMenuDisplayVisible()){
              this.Controller.SendKey(this.ZoneNumber, AnthemKeyCode.UP);
            } else{
              this.Controller.VolumeUp(this.ZoneNumber);
            }

            break;
          }
          case this.platform.Characteristic.RemoteKey.ARROW_DOWN: {
            if(this.Controller.GetIsMenuDisplayVisible()){
              this.Controller.SendKey(this.ZoneNumber, AnthemKeyCode.DOWN);
            } else {
              this.Controller.VolumeDown(this.ZoneNumber);
            }
            break;
          }
          case this.platform.Characteristic.RemoteKey.ARROW_LEFT: {
            if(this.Controller.GetZones()[this.ZoneNumber].GetIsMainZone()){
              this.Controller.SendKey(this.ZoneNumber, AnthemKeyCode.LEFT);
            }
            break;
          }
          case this.platform.Characteristic.RemoteKey.ARROW_RIGHT: {
            if(this.Controller.GetZones()[this.ZoneNumber].GetIsMainZone()){
              this.Controller.SendKey(this.ZoneNumber, AnthemKeyCode.RIGHT);
            }
            break;
          }
          case this.platform.Characteristic.RemoteKey.SELECT: {
            if(this.Controller.GetZones()[this.ZoneNumber].GetIsMainZone()){
              this.Controller.SendKey(this.ZoneNumber, AnthemKeyCode.SELECT);
            }
            break;
          }

          case this.platform.Characteristic.RemoteKey.BACK: {
            if(this.Controller.GetZones()[this.ZoneNumber].GetIsMainZone()){
              this.Controller.ToggleAudioListeningMode(this.ZoneNumber, true);
            }
            break;
          }

          case this.platform.Characteristic.RemoteKey.PLAY_PAUSE: {
            this.Controller.ToggleMute(this.ZoneNumber);
            break;
          }
          case this.platform.Characteristic.RemoteKey.INFORMATION: {
            if(this.Controller.GetZones()[this.ZoneNumber].GetIsMainZone()){
              this.Controller.ToggleConfigMenu();
            }
            break;
          }
        }
        callback();
      });

    // Set initial power status
    TVService.getCharacteristic(this.platform.Characteristic.Active).updateValue(this.Controller.GetZonePower(this.ZoneNumber));

    return TVService;
  }

  ConfigureTelevisionSpeakerService():Service{
    const Name = this.Controller.GetZoneName(this.ZoneNumber);
    const SpeakerService = this.ReceiverAccessory.addService(this.platform.Service.TelevisionSpeaker);
    SpeakerService.setCharacteristic(this.platform.Characteristic.Active, this.platform.Characteristic.Active.ACTIVE);
    SpeakerService.setCharacteristic(this.platform.Characteristic.Name, Name);
    SpeakerService.setCharacteristic(this.platform.Characteristic.VolumeControlType,
      this.platform.Characteristic.VolumeControlType.ABSOLUTE);

    SpeakerService.getCharacteristic(this.platform.Characteristic.Mute)
      .onSet(this.HandleMuteSet.bind(this));

    SpeakerService.getCharacteristic(this.platform.Characteristic.Volume)
      .onSet(this.HandleVolumeSet.bind(this));

    SpeakerService.getCharacteristic(this.platform.Characteristic.VolumeSelector)
      .onSet(this.HandleVolumeSelector.bind(this));

    return SpeakerService;
  }

  HandleMuteSet(newValue) {
    if(this.Controller.GetZone(this.ZoneNumber).GetIsPowered()){
      this.Controller.SetMute(this.ZoneNumber, Boolean(newValue));
    }
  }

  HandleVolumeSelector(Value){
    if(!this.Controller.GetZone(this.ZoneNumber).GetIsPowered()){
      this.Controller.PowerZone(this.ZoneNumber, true);
      return;
    }

    switch (Value) {
      case this.platform.Characteristic.VolumeSelector.INCREMENT: // Volume up
        this.Controller.VolumeUp(this.ZoneNumber);
        break;
      case this.platform.Characteristic.VolumeSelector.DECREMENT: // Volume down
        this.Controller.VolumeDown(this.ZoneNumber);
        break;
    }
  }

  HandleVolumeSet(newValue, callback){
    this.Controller.SetZoneVolumePercentage(this.ZoneNumber, newValue);
    callback();
  }
}
