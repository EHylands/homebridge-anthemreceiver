import { PlatformAccessory, Service } from 'homebridge';
import { AnthemController, AnthemKeyCode } from './AnthemController';
import { AnthemReceiverHomebridgePlatform } from './platform';
import { PLUGIN_NAME } from './settings';

export class AnthemReceiverPowerInputAccessory {
  private ReceiverAccessory: PlatformAccessory;
  private TVService: Service;
  //private SpeakerService: Service;

  private HdmiInputService: Service[];

  constructor(
    private readonly platform: AnthemReceiverHomebridgePlatform,
    //  private readonly accessory: PlatformAccessory,
    private readonly Controller: AnthemController,
    private readonly ZoneIndex: number,
  ) {

    this.ZoneIndex = ZoneIndex;
    const Name = this.Controller.GetZoneName(this.ZoneIndex);
    this.HdmiInputService = [];

    const uuid = this.platform.api.hap.uuid.generate('Anthem_Receiver' + this.Controller.ReceiverModel +
    this.Controller.SerialNumber + this.Controller.GetZoneNumber(ZoneIndex));
    this.ReceiverAccessory = new this.platform.api.platformAccessory(Name, uuid);
    this.ReceiverAccessory.category = this.platform.api.hap.Categories.TELEVISION;

  // set accessory information
  this.ReceiverAccessory.getService(this.platform.Service.AccessoryInformation)!
    .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Anthem')
    .setCharacteristic(this.platform.Characteristic.Model, Controller.ReceiverModel)
    .setCharacteristic(this.platform.Characteristic.SerialNumber, Controller.SerialNumber)
    .setCharacteristic(this.platform.Characteristic.FirmwareRevision, Controller.SoftwareVersion);

  this.TVService = this.ConfigureTelevisionservice();

  // this.SpeakerService = this.ConfigureTelevisionSpeakerService();

  // Initialise plugin
  //this.TVService.setCharacteristic(this.platform.Characteristic.ActiveIdentifier,
  //  this.Controller.GetZone(this.ZoneIndex).GetActiveInput());

  //this.TVService.setCharacteristic(this.platform.Characteristic.Active, this.Controller.GetZone(this.ZoneIndex).GetIsPowered());

  this.Controller.on('ZonePowerChange', (Zone: number, ZoneIndex: number, Power: boolean) => {
    if(this.ZoneIndex === ZoneIndex){
      this.TVService.updateCharacteristic(this.platform.Characteristic.Active, Power);
    }
  });

  this.Controller.on('ZoneInputChange', (Zone: number, ZoneIndex: number, Input: number) => {
    if(this.ZoneIndex === ZoneIndex){
      this.TVService.updateCharacteristic(this.platform.Characteristic.ActiveIdentifier, Input);
    }
  });

  this.Controller.on('ZoneMutedChange', (Zone: number, ZoneIndex: number, Muted:boolean) => {
    if(this.ZoneIndex === ZoneIndex){
      //this.SpeakerService.updateCharacteristic(this.platform.Characteristic.Mute, Muted);
    }
  });

  this.Controller.on('ZoneVolumePercentageChange', (Zone: number, ZoneIndex: number, VolumePercentage:number)=>{
    //this.SpeakerService.updateCharacteristic(this.platform.Characteristic.Volume, VolumePercentage);
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
    const Name = this.Controller.GetZoneName(this.ZoneIndex);
    const TVService = this.ReceiverAccessory.addService(this.platform.Service.Television);
    TVService.setCharacteristic(this.platform.Characteristic.ConfiguredName, Name);
    TVService.setCharacteristic(this.platform.Characteristic.SleepDiscoveryMode,
      this.platform.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);

    // Send change from homekit to Anthem Receiver - Power
    TVService.getCharacteristic(this.platform.Characteristic.Active)
      .onSet((newValue) => {
        this.Controller.PowerZone(this.ZoneIndex, newValue === 1);
      });

    // Send change from homekit to Anthem Receiver - Active input
    TVService.getCharacteristic(this.platform.Characteristic.ActiveIdentifier)
      .onSet((newValue) => {
        this.Controller.SetZoneInput(this.ZoneIndex, Number(newValue));
      });

    TVService
      .getCharacteristic(this.platform.Characteristic.RemoteKey)
      .on('set', async (newValue, callback) => {
        if(!this.Controller.GetZone(this.ZoneIndex).GetIsPowered()){
          this.Controller.PowerZone(this.ZoneIndex, true);
          callback();
          return;
        }

        switch (newValue) {
          case this.platform.Characteristic.RemoteKey.ARROW_UP: {
            if(this.Controller.GetIsMenuDisplayVisible()){
              this.Controller.SendKey(this.ZoneIndex, AnthemKeyCode.UP);
            } else{
              this.Controller.VolumeUp(this.ZoneIndex);
            }

            break;
          }
          case this.platform.Characteristic.RemoteKey.ARROW_DOWN: {
            if(this.Controller.GetIsMenuDisplayVisible()){
              this.Controller.SendKey(this.ZoneIndex, AnthemKeyCode.DOWN);
            } else {
              this.Controller.VolumeDown(this.ZoneIndex);
            }
            break;
          }
          case this.platform.Characteristic.RemoteKey.ARROW_LEFT: {
            if(this.Controller.GetZone(this.ZoneIndex).IsMainZone){
              this.Controller.SendKey(this.ZoneIndex, AnthemKeyCode.LEFT);
            }
            break;
          }
          case this.platform.Characteristic.RemoteKey.ARROW_RIGHT: {
            if(this.Controller.GetZone(this.ZoneIndex).IsMainZone){
              this.Controller.SendKey(this.ZoneIndex, AnthemKeyCode.RIGHT);
            }
            break;
          }
          case this.platform.Characteristic.RemoteKey.SELECT: {
            if(this.Controller.GetZone(this.ZoneIndex).IsMainZone){
              this.Controller.SendKey(this.ZoneIndex, AnthemKeyCode.SELECT);
            }
            break;
          }

          case this.platform.Characteristic.RemoteKey.BACK: {
            if(this.Controller.GetZone(this.ZoneIndex).IsMainZone){
              this.Controller.ToggleAudioListeningMode(this.ZoneIndex, true);
            }
            break;
          }

          case this.platform.Characteristic.RemoteKey.PLAY_PAUSE: {
            this.Controller.ToggleMute(this.ZoneIndex);
            break;
          }
          case this.platform.Characteristic.RemoteKey.INFORMATION: {
            if(this.Controller.GetZone(this.ZoneIndex).IsMainZone){
              this.Controller.ToggleConfigMenu();
            }
            break;
          }
        }
        callback();
      });
    return TVService;
  }

  ConfigureTelevisionSpeakerService():Service{
    const Name = this.Controller.GetZoneName(this.ZoneIndex);
    const SpeakerService = this.ReceiverAccessory.addService(this.platform.Service.TelevisionSpeaker);
    SpeakerService.setCharacteristic(this.platform.Characteristic.Active, this.platform.Characteristic.Active.ACTIVE);
    SpeakerService.setCharacteristic(this.platform.Characteristic.Name, Name);
    SpeakerService.setCharacteristic(this.platform.Characteristic.VolumeControlType,
      this.platform.Characteristic.VolumeControlType.ABSOLUTE);

    SpeakerService.getCharacteristic(this.platform.Characteristic.Mute)
      .onGet(this.HandleMuteGet.bind(this))
      .onSet(this.HandleMuteSet.bind(this));

    SpeakerService.getCharacteristic(this.platform.Characteristic.Volume)
      .on('get', this.HandleVolumeGet.bind(this)) // Not working
      .on('set', this.HandleVolumeSet.bind(this));

    SpeakerService.getCharacteristic(this.platform.Characteristic.VolumeSelector)
      .onSet(this.HandleVolumeSelector.bind(this));

    return SpeakerService;
  }

  GetZoneIndex(){
    return this.ZoneIndex;
  }

  HandleMuteGet() {
    return this.Controller.GetMute(this.ZoneIndex);
  }

  HandleMuteSet(newValue) {
    if(this.Controller.GetZone(this.ZoneIndex).GetIsPowered()){
      this.Controller.SetMute(this.ZoneIndex, Boolean(newValue));
    }
  }

  // Not working for the moment.
  HandleVolumeGet(callback){
    const VP = this.Controller.GetZone(this.ZoneIndex).GetVolumePercentage();
    //this.SpeakerService.updateCharacteristic(this.platform.Characteristic.Volume, VP);
    callback(VP);
  }

  HandleVolumeSelector(Value){
    if(!this.Controller.GetZone(this.ZoneIndex).GetIsPowered()){
      this.Controller.PowerZone(this.ZoneIndex, true);
      return;
    }

    switch (Value) {
      case this.platform.Characteristic.VolumeSelector.INCREMENT: // Volume up
        this.Controller.VolumeUp(this.ZoneIndex);
        break;
      case this.platform.Characteristic.VolumeSelector.DECREMENT: // Volume down
        this.Controller.VolumeDown(this.ZoneIndex);
        break;
    }
  }

  HandleVolumeSet(newValue, callback){
    this.Controller.SetZoneVolumePercentage(this.ZoneIndex, newValue);
    callback();
  }

}
