import { Service } from 'homebridge';
import { isRegExp } from 'util';
import { AnthemController, AnthemKeyCode } from './AnthemController';
import { AnthemReceiverHomebridgePlatform } from './platform';
import { PLUGIN_NAME } from './settings';


enum MenuItem {
  VOLUME ='Volume',
  ARC = 'ARC',
  MUTE = 'Mute',
  PROFILE = 'Profile',
  CURRENT_AUDIO_MODE = 'Current Audio Mode',
  FRONT = 'Front',
  CENTTER = 'Center',
  SUBWOOFERS = 'Subwoofers',
  SUROUND = 'Suround',
  BACK = 'Back',
  FRONT_IN_CEILING = 'Front In-Ceiling',
  BACK_IN_CEILING = 'Baack In-Ceiling',
  BALANCE = 'Balance',
  TREBBLE = 'Trebble',
  BASS = 'Bass',
}


export class AnthemReceiverPowerInputAccessory {
  private service: Service;

private Menu = [
  [MenuItem.VOLUME, MenuItem.MUTE, MenuItem.CURRENT_AUDIO_MODE, MenuItem.ARC, MenuItem.PROFILE],
  [MenuItem.FRONT, MenuItem.CENTTER, MenuItem.SUBWOOFERS, MenuItem.SUROUND,
    MenuItem.BACK, MenuItem.FRONT_IN_CEILING, MenuItem.BACK_IN_CEILING],
  [MenuItem.BALANCE, MenuItem.CENTTER, MenuItem.BASS]];

private MainMenuIndex = 0;
private SubMenuIndex = [0, 0, 0];


constructor(
    private readonly platform: AnthemReceiverHomebridgePlatform,
    //  private readonly accessory: PlatformAccessory,
    private readonly Controller: AnthemController,
    private readonly ZoneIndex: number,
) {

  this.ZoneIndex = ZoneIndex;
  const Name = this.Controller.GetZoneName(this.ZoneIndex);

  const uuid = this.platform.api.hap.uuid.generate('Anthem_Receiver12345' + this.Controller.ReceiverModel +
    this.Controller.SerialNumber + this.Controller.GetZone(ZoneIndex));
  const ReceiverAccessory = new this.platform.api.platformAccessory(Name, uuid);
  ReceiverAccessory.category = this.platform.api.hap.Categories.TELEVISION;
  this.service = ReceiverAccessory.addService(this.platform.Service.Television);
  this.service.setCharacteristic(this.platform.Characteristic.ConfiguredName, Name);
  this.service.setCharacteristic(this.platform.Characteristic.SleepDiscoveryMode,
    this.platform.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);

    // set accessory information
    ReceiverAccessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Anthem')
      .setCharacteristic(this.platform.Characteristic.Model, Controller.ReceiverModel)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, Controller.SerialNumber)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, Controller.SoftwareVersion);

    this.service
      .getCharacteristic(this.platform.Characteristic.RemoteKey)
      .on('set', async (newValue, callback) => {

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
            } else{
              this.Controller.VolumeDown(this.ZoneIndex);
            }
            break;
          }
          case this.platform.Characteristic.RemoteKey.ARROW_LEFT: {
            this.Controller.SendKey(this.ZoneIndex, AnthemKeyCode.LEFT);
            break;
          }
          case this.platform.Characteristic.RemoteKey.ARROW_RIGHT: {
            this.Controller.SendKey(this.ZoneIndex, AnthemKeyCode.RIGHT);
            break;
          }
          case this.platform.Characteristic.RemoteKey.SELECT: {
            this.Controller.SendKey(this.ZoneIndex, AnthemKeyCode.SELECT);
            break;
          }

          case this.platform.Characteristic.RemoteKey.BACK: {
            if(this.Controller.GettIsMainZone(this.ZoneIndex)){
              this.Controller.ToggleAudioListeningMode(this.ZoneIndex, true);
            }
            break;
          }

          case this.platform.Characteristic.RemoteKey.PLAY_PAUSE: {
            this.Controller.ToggleMute(this.ZoneIndex);
            break;
          }
          case this.platform.Characteristic.RemoteKey.INFORMATION: {
            if(this.Controller.GettIsMainZone(this.ZoneIndex)){
              this.Controller.ToggleConfigMenu();
            }
            break;
          }
        }

        callback();
      });

    // Initialise plugin
    this.service.setCharacteristic(this.platform.Characteristic.ActiveIdentifier,
      this.Controller.GetActiveInputForZoneIndex(this.ZoneIndex));
    this.service.setCharacteristic(this.platform.Characteristic.Active, this.Controller.GetZonePower(this.ZoneIndex));

    // Send change from homekit to Anthem Receiver - Power
    this.service.getCharacteristic(this.platform.Characteristic.Active)
      .onSet((newValue) => {
        this.Controller.PowerZone(this.ZoneIndex, newValue === 1);
      });

    // Send change from homekit to Anthem Receiver - Active input
    this.service.getCharacteristic(this.platform.Characteristic.ActiveIdentifier)
      .onSet((newValue) => {
        this.Controller.SetZoneInput(this.ZoneIndex, Number(newValue));
      });

    // Configure inputs names
    for (let i = 0; i < this.Controller.GetNumberOfInput() ; i++){
      const hdmiInputService = ReceiverAccessory.addService(this.platform.Service.InputSource, 'hdmi'+(i+1), 'HDMI '+ (i+1));
      hdmiInputService
        .setCharacteristic(this.platform.Characteristic.Identifier, (i+1))
        .setCharacteristic(this.platform.Characteristic.ConfiguredName, this.Controller.GetInputName(i))
        .setCharacteristic(this.platform.Characteristic.IsConfigured, this.platform.Characteristic.IsConfigured.CONFIGURED)
        .setCharacteristic(this.platform.Characteristic.InputSourceType, this.platform.Characteristic.InputSourceType.HDMI);
      this.service.addLinkedService(hdmiInputService);
    }

    this.Controller.on('ZonePowerChange', (Zone: number, ZoneIndex: number, Power: boolean) => {
      if(this.ZoneIndex === ZoneIndex){
        this.service.updateCharacteristic(this.platform.Characteristic.Active, Power);
      }
    });

    this.Controller.on('ZoneInputChange', (Zone: number, ZoneIndex: number, Input: number) => {
      if(this.ZoneIndex === ZoneIndex){
        this.service.updateCharacteristic(this.platform.Characteristic.ActiveIdentifier, Input);
      }
    });

    //this.Controller.on('InputNameChange', (Input, Name) =>{
    //  // Todo, manage how to chaange input name
    //});

    this.platform.api.publishExternalAccessories(PLUGIN_NAME, [ReceiverAccessory]);
}

GetZoneIndex(){
  return this.ZoneIndex;
}
}
