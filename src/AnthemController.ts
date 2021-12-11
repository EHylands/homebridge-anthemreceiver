import { TypedEmitter } from 'tiny-typed-emitter';
import net = require('net');

export interface AnthemControllerEvent {
    'ControllerReadyForOperation': () => void;
    'ZonePowerChange': (Zone: number, ZoneIndex: number, Power: boolean) => void;
    'ZoneMutedChange': (Zone: number, ZoneIndex: number, Muted:boolean)=> void;
    'ZoneVolumePercentageChange': (Zone: number, ZoneIndex: number, VolumePercentage:number)=> void;
    'ZoneInputChange': (Zone: number, ZoneIndex: number, Input: number) => void;
    'InputChange':(InputArray: string[]) => void;
    'ControllerError': (Error: AnthemControllerError, ErrorString: string) => void;
    'ShowDebugInfo':(DebugString: string)=> void;
  }

export enum AnthemReceiverModel {
  Undefined = '',
  MRX310 = 'MRX 310',
  MRX510 = 'MRX 510',
  MRX710 = 'MRX 710',
  MRX520 = 'MRX 520',
  MRX720 = 'MRX 720',
  MRX1120 = 'MRX 1120',
  MRX540 = 'MRX 540',
  MRX740 = 'MRX 740',
  MRX1140 = 'MRX 1140',
  AVM60 = 'AVM 60',
  AVM70 = 'AVM 70',
  AVM90 = 'AVM 90'
}

const AllAnthemReceiverModel = [
  AnthemReceiverModel.MRX310,
  AnthemReceiverModel.MRX510,
  AnthemReceiverModel.MRX710,
  AnthemReceiverModel.MRX520,
  AnthemReceiverModel.MRX720,
  AnthemReceiverModel.MRX1120,
  AnthemReceiverModel.MRX540,
  AnthemReceiverModel.MRX740,
  AnthemReceiverModel.MRX1140,
  AnthemReceiverModel.AVM60,
  AnthemReceiverModel.AVM70,
  AnthemReceiverModel.AVM90,
];

const ProtocolV01Model = [
  AnthemReceiverModel.MRX310,
  AnthemReceiverModel.MRX510,
  AnthemReceiverModel.MRX710,
  AnthemReceiverModel.MRX520,
  AnthemReceiverModel.MRX720,
  AnthemReceiverModel.MRX1120,
  AnthemReceiverModel.AVM60,
];

const ProtocolV02Model = [
  AnthemReceiverModel.MRX540,
  AnthemReceiverModel.MRX740,
  AnthemReceiverModel.MRX1140,
  AnthemReceiverModel.AVM70,
  AnthemReceiverModel.AVM90,
];

enum ControllerState {
    Idle,
    Configure,
    Operation,
}

export enum AnthemControllerError {
    CONNECTION_ERROR = 'Controller Connection Error',
    ZONE_IS_NOT_POWERED = 'Zone is not powered',
    COMMAND_NOT_SUPPORTED = 'Command is not supported by receiver',
    RECEIVER_NOT_READY = 'Receiver not ready for operation',
    INVALID_MODEL_STRING_RECEIVED = 'Received and invalid model string from receiver',
    CANNOT_EXECUTE_COMMAND = 'Received a valid command that cannot be executed',
    OUT_OF_RANGE_PARAMETER = 'Controller received an out of range paramenter',
    INVALID_COMMAND = 'Invalid command reveived',
    COMMAND_ONLY_AVAILABLE_ON_MAIN_ZONE = 'Command only available on main zone'
  }

export enum AnthemKeyCode {
    UP = '0018',
    DOWN = '0019',
    LEFT = '0020',
    RIGHT = '0021',
    SELECT = '0022'
  }

export class AnthemZone{
  ZoneNumber = 0;
  IsMainZone = false;
  private IsMuted = false;
  private ActiveInput = 0;
  private IsPowered = false;
  private PowerConfigured = false;
  private VolumePercentage = 0;
  private Volume = 0;
  ZoneName = '';

  constructor(ZoneNumber: number, ZoneName: string, IsMainZone: boolean) {
    this.ZoneNumber = ZoneNumber;
    this.ZoneName = ZoneName;
    this.IsMainZone = IsMainZone;
  }

  GetIsMuted():boolean{
    return this.IsMuted;
  }

  SetIsMuted(Muted:boolean){
    this.IsMuted = Muted;
  }

  GetIsPowered():boolean{
    return this.IsPowered;
  }

  SetIsPowered(Powered: boolean){
    this.IsPowered = Powered;
    this.PowerConfigured = true;
  }

  GetActiveInput():number{
    return this.ActiveInput;
  }

  SetActiveInput(ActiveInput: number){
    this.ActiveInput = ActiveInput;
  }

  GetVolumePercentage():number{
    return this.VolumePercentage;
  }

  GetVolume():number{
    return this.Volume;
  }

  SetVolumePercentage(VolumePercentage:number){
    this.VolumePercentage = VolumePercentage;
  }

  SetVolume(Volume:number){
    this.Volume = Volume;
  }

  IsZoneConfigured():boolean{
    return this.PowerConfigured;
  }
}

export class AnthemController extends TypedEmitter<AnthemControllerEvent> {

    private Host = '';
    private Port = 14999;
    private Client = new net.Socket();
    private CurrentState = ControllerState.Idle;
    private CommandArray: string[] = [];
    private InputNameArray:string[] = [];
    private InputNameArrayOld:string[] = []; // Used to check for any changes when inputs name are refreshed
    private ZonesArray: AnthemZone[] = [];
    private ConfigMenuDisplayVisible = false;
    private SocketTimeout = 300000; // 5 minutes

    SerialNumber = '';
    SoftwareVersion = '';
    ReceiverModel = AnthemReceiverModel.Undefined;

    constructor() {
      super();
    }

    Connect(Host: string, Port:number){

      this.Client = new net.Socket();
      this.Client.setTimeout(this.SocketTimeout);

      this.Host = Host;
      this.Port = Port;

      this.Client.on('data', (data) => {
        this.AnalyseResponse(data);
      });

      this.Client.on('error', (err) =>{
        this.CurrentState = ControllerState.Idle;
        this.emit('ControllerError', AnthemControllerError.CONNECTION_ERROR, err.message);
        this.Client.destroy();

      });

      this.Client.on('timeout', ()=>{
        this.CurrentState = ControllerState.Idle;
        this.emit('ControllerError', AnthemControllerError.CONNECTION_ERROR, 'Timeout');
        this.Client.destroy();
      });

      this.Client.connect(this.Port, this.Host, () => {
        // This controller supports 2 protocols:
        // - Protocol V02 used for X40 Model Serie
        // - Protocol V01 used for X10 and X20 Model Serie
        // - Need Model Number to send proper commands to receiver
        this.GetModel();
      });
    }

    AddControllingZone(NewZone: number, ZoneName: string, IsMainZone: boolean):boolean {
      // We can only add a new zone while the controller is Idle
      if(this.CurrentState !== ControllerState.Idle){
        return false;
      }

      // Check if zone is 1 or 2;
      if(NewZone !== 1 && NewZone !== 2){
        return false;
      }

      // Cannot add a duplicate zone.
      for (let i = 0 ; i < this.ZonesArray.length ; i++){
        if(this.ZonesArray[i].ZoneNumber === NewZone){
          return false;
        }
      }

      this.ZonesArray.push(new AnthemZone(NewZone, ZoneName, IsMainZone));
      return true;
    }

    GetZone(ZoneIndex: number):AnthemZone{
      return this.ZonesArray[ZoneIndex];
    }

    GetZoneNumber(ZoneIndex: number):number{
      return this.ZonesArray[ZoneIndex].ZoneNumber;
    }

    GetIsMenuDisplayVisible(){
      return this.ConfigMenuDisplayVisible;
    }

    GetZoneIndex(ZoneNumber: number){
      for (let i = 0 ; i < this.ZonesArray.length; i++){
        if(this.ZonesArray[i].ZoneNumber === ZoneNumber){
          return i;
        }
      }
      return -1;
    }

    GetZoneName(ZoneIndex: number){
      return this.ZonesArray[ZoneIndex].ZoneName;
    }

    GetConfiguredZoneNumber(){
      return this.ZonesArray.length;
    }

    GetNumberOfInput(){
      return this.InputNameArray.length;
    }

    GetInputs(){
      return this.InputNameArray;
    }

    //
    // Function GetInputHasChange()
    // To be called after receiver updates inputs name
    // Check if any input has changed with update
    //
    private GetInputHasChange():boolean{
      if(this.InputNameArray.length !== this.InputNameArrayOld.length){
        return true;
      }

      for(let i = 0 ; i < this.InputNameArray.length ; i++){
        if(this.InputNameArray[i] !== this.InputNameArrayOld[i]){
          return true;
        }
      }
      return false;
    }

    //
    // Function Queue Command()
    // Insert a new command in the queue. Dont sent immediatly
    //
    private QueueCommand(Command:string){
      this.CommandArray.push(Command);
    }

    //
    // Function SendCommand()
    // Clear the Command Buffer and send to receiver
    //
    private SendCommand(){
      let CommandString = '';
      for(let i = 0 ; i < this.CommandArray.length ; i ++){
        CommandString = CommandString + this.CommandArray[i] + ';';
      }

      // Show extended debug information in homebridge log
      this.emit('ShowDebugInfo', 'Sending: ' + CommandString);

      this.Client.write(CommandString);
      this.CommandArray = [];
    }

    //
    // Function IsProtocolV01()
    // Check if current model support protocol V01
    // Anthem MRX 710-510-310 AVR
    // Anthem MRX 1120-720-520 AVR and AVM 60
    //
    private IsProtocolV01():boolean{
      if(ProtocolV01Model.indexOf(this.ReceiverModel) !== -1){
        return true;
      }
      return false;
    }

    //
    // Function IsProtocolV02()
    // Check if current model support protocol V02
    // Anthem MRX 1140-740-540 AVR and AVM 90-70 AVP
    //
    private IsProtocolV02():boolean{
      if(ProtocolV02Model.indexOf(this.ReceiverModel) !== -1){
        return true;
      }
      return false;
    }

    //
    // Function GetModelFromReceiver()
    // Get model number from receiver
    //
    // Availability: All models supported by controller
    private GetModelFromReceiver(){
      this.QueueCommand('IDM?');
    }

    //
    // Function SendKeepAlivePacket()
    // Keep connection open (Receiver will process GetModel command even when powered off)
    //
    // Availability: All models supported by controller
    private SendKeepAlivePacket(){
      setTimeout(() => {
        this.GetModelFromReceiver();
        this.SendCommand();
      }, this.SocketTimeout/2);
    }

    //
    // Function GetSerialNumberFromReceiver()
    // Get serial number from receiver
    //
    // Availability:
    // Anthem MRX 1140-740-540 AVR and AVM 90-70 AVP
    //
    private GetSerialNumberFromReceiver(){

      if(!this.IsProtocolV02()){
        this.CurrentState = ControllerState.Idle;
        this.emit('ControllerError', AnthemControllerError.COMMAND_NOT_SUPPORTED, 'GetSerial (GSN?)');
        return;
      }
      this.QueueCommand('GSN?');
    }

    //
    // Function GetMACAddress()
    // Get MAC Address from receiver. To be used as unique id
    //
    // Availability:
    // Anthem MRX 710-510-310 AVR
    // Anthem MRX 1120-720-520 AVR and AVM 60
    //
    GetMACAddress(){
      if(!this.IsProtocolV01()){
        this.CurrentState = ControllerState.Idle;
        this.emit('ControllerError', AnthemControllerError.COMMAND_NOT_SUPPORTED, 'GetMACAddress (IDN?)');
        return;
      }
      this.QueueCommand('IDN?');
    }

    //
    // Function GetsoftwareVersionFromReceiver()
    // Get software version from receiver
    //
    // Availability: All models supported by controller
    private GetsoftwareVersionFromReceiver(){
      this.QueueCommand('IDS?');
    }

    //
    // Function GetIsZonePoweredFromReceiver()
    // Get zone power status from receiver
    //
    // Availability: All models supported by controller
    private GetIsZonePoweredFromReceiver(ZoneIndex: number){
      this.QueueCommand('Z' + this.ZonesArray[ZoneIndex].ZoneNumber + 'POW?');
    }

    //
    // Function GetIsZoneMutedromReceiver()
    // Get zone muted status from receiver
    //
    // Availability: All models supported by controller
    private GetIsZoneMutedFromReceiver(ZoneIndex: number){
      this.QueueCommand('Z' + this.ZonesArray[ZoneIndex].ZoneNumber + 'MUT?');
    }

    private GetZoneVolumeFromReceiver(ZoneIndex:number){
      this.QueueCommand('Z' + this.ZonesArray[ZoneIndex].ZoneNumber + 'VOL?');
    }

    private GetZoneVolumePercentageFromReceiver(ZoneIndex:number){
      this.QueueCommand('Z' + this.ZonesArray[ZoneIndex].ZoneNumber + 'PVOL?');
    }

    SetZoneVolumePercentage(ZoneIndex:number, VolumePercentage: number){
      this.QueueCommand('Z' + this.ZonesArray[ZoneIndex].ZoneNumber + 'PVOL' + VolumePercentage);
      this.SendCommand();
    }

    //
    // Function  GetNumberOfInputFromReceiver()
    // Get nimber of input from receiver
    //
    // Availability: All models supported by controller
    private GetNumberOfInputFromReceiver(){
      this.QueueCommand('ICN?');
    }

    //
    // Function GetInputsNameFromReceiver()
    // Get input name from receiver
    //
    // Availability: All model
    //
    private GetInputsNameFromReceiver(){

      if(this.IsProtocolV01()){
        for(let i = 1 ; i <= this.InputNameArray.length ; i++){
          if(i < 10){
            this.QueueCommand('ISN0' + i + '?');
          } else{
            this.QueueCommand('ISN' + i + '?');
          }
        }
      }

      if(this.IsProtocolV02()){
        for(let i = 1 ; i <= this.InputNameArray.length ; i++){
          this.QueueCommand('IS' + i +'IN?');
        }
      }

      this.SendCommand();
    }

    //
    // Function GetZoneActiveInputFromReceiver()
    // Get zone active input
    //
    // Availability: All model
    private GetZoneActiveInputFromReceiver(ZoneIndex:number){
      this.QueueCommand('Z' + this.ZonesArray[ZoneIndex].ZoneNumber + 'INP?');
    }

    //
    // Function SetZoneInput()
    // Set Zone active input
    //
    // Availability: All model
    SetZoneInput(ZoneIndex: number, InputNumber: number){
      this.QueueCommand('Z' + this.ZonesArray[ZoneIndex].ZoneNumber + 'INP' + InputNumber);
      this.SendCommand();
    }

    //
    // Function GetZoneActiveInputARCEnabled()
    // Iterate throught inputs
    //
    // Availability: x40 models
    GetZoneActiveInputARCEnabled(ZoneIndex:number){

      if(!this.IsProtocolV02()){
        this.emit('ControllerError', AnthemControllerError.INVALID_COMMAND,
          'SetZoneActiveInputARCEnable command only supported on x40 models');
        return;
      }

      if(!this.ZonesArray[ZoneIndex].IsMainZone){
        this.emit('ControllerError', AnthemControllerError.INVALID_COMMAND,
          'ARC Command only available on main zone');
        return;
      }

      this.QueueCommand('IS' + (this.ZonesArray[ZoneIndex].GetActiveInput()+1) + 'ARC?');
      this.SendCommand();
    }

    //
    // Function SetZoneActiveInputARCEnable()
    // Iterate throught inputs
    //
    // Availability: x40 models
    SetZoneActiveInputARCEnable(ZoneIndex:number, ARCEnabled:boolean){

      if(!this.ZonesArray[ZoneIndex].IsMainZone){
        this.emit('ControllerError', AnthemControllerError.INVALID_COMMAND,
          'ARC Command only available on main zone');
        return;
      }

      if(!this.IsProtocolV02()){
        this.emit('ControllerError', AnthemControllerError.INVALID_COMMAND,
          'SetZoneActiveInputARCEnable command only supported ond x40 models');
        return;
      }

      if(ARCEnabled){
        this.QueueCommand('IS' + this.ZonesArray[ZoneIndex].GetActiveInput() +'ARC' + '1');
      }else{
        this.QueueCommand('IS' + this.ZonesArray[ZoneIndex].GetActiveInput() +'ARC' + '0');
      }
      this.SendCommand();
    }

    //
    // Function ToggleAudioListeningMode()
    // Iterate throught inputs
    //
    // Availability: All model
    ToggleAudioListeningMode(ZoneIndex:number, UP: boolean){
      if(!this.ZonesArray[ZoneIndex].IsMainZone){
        this.emit('ControllerError', AnthemControllerError.COMMAND_ONLY_AVAILABLE_ON_MAIN_ZONE, '');
        return;
      }

      if(this.IsProtocolV02()){
        if(UP){
          this.QueueCommand('Z1AUP');
        } else{
          this.QueueCommand('Z1ADN');
        }
      } else{
        if(UP){
          this.QueueCommand('Z1ALMna');

        } else{
          this.QueueCommand('Z1ALMpa');
        }

      }
      this.SendCommand();
    }

    // All zone need to have IsMuted, IsPowered and ActiveInput set before starting
    // Controller operation;
    IsAllZoneConfigured(){

      if(this.IsProtocolV01()){
        for(let i = 0 ; i < this.ZonesArray.length ; i++){
          if(this.ZonesArray[i].IsZoneConfigured() === false){
            return false;
          }
        }
        return true;
      }

      if(this.IsProtocolV02()){

        for(let i = 0 ; i < this.ZonesArray.length ; i++){
          if(this.ZonesArray[i].IsZoneConfigured() === false){
            return false;
          }
        }

        return this.IsAllInputConfigured();
      }
    }

    //
    // Function IsAllInputConfigured()
    // Check if name has been set or all inputs
    //
    IsAllInputConfigured(){
      if(this.InputNameArray.length === 0){
        return false;
      }

      for( let i = 0 ; i < this.InputNameArray.length; i ++){
        if(this.InputNameArray[i] === undefined){
          return false;
        }
      }
      return true;
    }

    //
    // Function PowerZone()
    // Set power to zone
    //
    PowerZone(ZoneIndex: number, Power:boolean){
      if(Power === true){
        this.QueueCommand('Z' + this.ZonesArray[ZoneIndex].ZoneNumber + 'POW1');
      } else{
        this.QueueCommand('Z' + this.ZonesArray[ZoneIndex].ZoneNumber + 'POW0');
      }
      this.SendCommand();
    }

    //
    // Function ToggleMute()
    //
    // Availability: All model
    ToggleMute(ZoneIndex: number){
      this.QueueCommand('Z' + this.ZonesArray[ZoneIndex].ZoneNumber + 'MUTt');
      this.SendCommand();
    }

    //
    // Function SetMute()
    //
    // Availability: All model
    SetMute(ZoneIndex: number, Mute: boolean){

      let m = '0';
      if(Mute === true){
        m = '1';
      }
      this.QueueCommand('Z' + this.ZonesArray[ZoneIndex].ZoneNumber + 'MUT' + m);
      this.SendCommand();
    }

    //
    // Function GetMute()
    //
    // Availability: All model
    GetMute(ZoneIndex: number):boolean{
      return this.ZonesArray[ZoneIndex].GetIsMuted();
    }

    //
    // Function VolumeUp()
    //
    // Availability: All model
    VolumeUp(ZoneIndex: number){

      const ZoneNumber = this.ZonesArray[ZoneIndex].ZoneNumber;

      if(this.IsProtocolV02()){
        this.QueueCommand('Z'+ ZoneNumber + 'VUP');
        this.SendCommand();
        return;
      }

      if(this.IsProtocolV01()){
        this.QueueCommand('Z'+ ZoneNumber + 'VUP1');
        this.SendCommand();
        return;
      }
    }

    //
    // Function Volume Down()
    //
    // Availability: All model
    VolumeDown(ZoneIndex: number){

      if(this.IsProtocolV02()){
        this.QueueCommand('Z'+ this.ZonesArray[ZoneIndex].ZoneNumber + 'VDN');
      } else{
        this.QueueCommand('Z'+ this.ZonesArray[ZoneIndex].ZoneNumber + 'VDN1');
      }
      this.SendCommand();
    }

    //
    // Function ToggleConfigMenu()
    // Show on screen configuration menu
    //
    // Availability: All model
    ToggleConfigMenu(){
      this.QueueCommand('Z1SMDt');
      this.SendCommand();
    }

    //
    // Function ToggleConfigMenu()
    // Show on screen configuration menu
    //
    // Availability: All model
    GetConfigMenuState(){
      this.QueueCommand('Z1SMD?');
    }

    //
    // Function SendKey()
    //
    // Availability: All model
    SendKey(ZoneIndex: number, Code: AnthemKeyCode){
      this.QueueCommand('Z'+ this.ZonesArray[ZoneIndex].ZoneNumber + 'SIM'+ Code);
      this.SendCommand();
    }

    //
    // Function GetZonePower()
    // Get Zone power status
    //
    GetZonePower(ZoneIndex: number){
      return this.ZonesArray[ZoneIndex].GetIsPowered();
    }

    //
    // Function SetModel
    // Set receiver model from string received from receiver
    //
    private SetModel(ModelString: string){

      // Check for extra white space at the end of ModelString
      let ModifiedModelString = ModelString;
      if(ModifiedModelString.slice(ModifiedModelString.length-1) === ' '){
        ModifiedModelString = ModifiedModelString.slice(0, ModifiedModelString.length-1);
      }

      for(let i = 0 ; i < AllAnthemReceiverModel.length ; i++){
        if(ModifiedModelString === AllAnthemReceiverModel[i]){
          // Found a match
          this.ReceiverModel = AllAnthemReceiverModel[i];
          return;
        }
      }

      // No match.
      // For debug purpose, asssume model MRX 740
      this.emit('ControllerError', AnthemControllerError.INVALID_MODEL_STRING_RECEIVED, ModifiedModelString);
      this.ReceiverModel = AnthemReceiverModel.MRX740;
    }

    //
    // Function GetModel
    // First step for controller configuration
    // Need to get model from receiver to send proper command format afterward.
    private GetModel(){
      this.CurrentState = ControllerState.Configure;
      this.GetModelFromReceiver();
      this.SendCommand();
    }

    //
    // Function UpdateOnZonePower
    //
    //
    private UpdateOnZonePower(ZoneIndex:number){

      this.GetZoneActiveInputFromReceiver(ZoneIndex);
      this.GetIsZoneMutedFromReceiver(ZoneIndex);
      this.GetZoneVolumeFromReceiver(ZoneIndex);

      if(this.IsProtocolV02()){
        this.GetZoneVolumePercentageFromReceiver(ZoneIndex);
      }

      this.GetConfigMenuState();
      this.GetNumberOfInputFromReceiver();
      this.SendCommand();
    }

    //
    // Function Configure
    // Second step for controller configuration
    // Need to get model from receiver to send proper command format afterward.
    private Configure(){
      this.CurrentState = ControllerState.Configure;

      this.GetsoftwareVersionFromReceiver();

      if(this.IsProtocolV01()){
        this.GetMACAddress();
      }

      // Protocol 2 devices can read inputs number and inputs names even if zone is powered off
      if(this.IsProtocolV02()){
        this.GetSerialNumberFromReceiver();
        this.GetNumberOfInputFromReceiver();
      }

      for(let i = 0 ; i < this.ZonesArray.length ; i ++ ){
        this.GetIsZonePoweredFromReceiver(i);
      }

      this.SendCommand();
    }

    //
    // Function AnalyseResponse
    // Process data received from receiver
    //
    private AnalyseResponse(Data: Buffer){
      const SplitString = Data.toString().split(';');

      for(let i = 0 ; i < SplitString.length - 1 ; i ++){
        let Response = SplitString[i];

        this.emit('ShowDebugInfo', 'Reading: "' + Response + '"');

        // Remove white space if present
        if(Response.slice(Response.length-1) === ' '){
          Response = Response.slice(0, Response.length-1);
        }

        if(Response.length !== 0){

          // Get Device Model
          if(Response.substring(0, 3) === 'IDM'){
            this.SetModel(Response.substring(3, Response.length));
            if(this.CurrentState === ControllerState.Configure){
              this.Configure();
            } else{
              // Continue keep alive process
              this.SendKeepAlivePacket();
            }
          }

          // Get Serial Number
          if(Response.substring(0, 3) === 'GSN'){
            this.SerialNumber = Response.substring(3, Response.length);
          }

          // Get Mac Address
          if(Response.substring(0, 3) === 'IDN'){
            this.SerialNumber = Response.substring(3, Response.length);
          }

          // Get software version
          if(Response.substring(0, 3) === 'IDS'){
            this.SoftwareVersion = Response.substring(3, Response.length);
          }

          // Get number of input
          if(Response.substring(0, 3) === 'ICN'){
            const NumberInput = Number(Response.substring(3, Response.length));
            this.InputNameArrayOld = this.InputNameArray;
            this.InputNameArray = new Array(NumberInput);
            this.GetInputsNameFromReceiver();
          }

          // Get Zone power status
          for(let j = 0 ; j < this.ZonesArray.length ; j++){
            if(Response.substring(0, 5) === ('Z' + this.ZonesArray[j].ZoneNumber + 'POW')){
              this.ZonesArray[j].SetIsPowered(Response[5] === '1');

              // Update zone info when power is on
              if(this.ZonesArray[j].GetIsPowered()){
                this.UpdateOnZonePower(j);
              }
            }

            if(this.CurrentState === ControllerState.Operation){
              this.emit('ZonePowerChange', this.ZonesArray[j].ZoneNumber, j, this.ZonesArray[j].GetIsPowered());
            }
          }

          // Set Zone Mute
          for(let j = 0 ; j < this.ZonesArray.length ; j++){
            if(Response.substring(0, 5) === ('Z' + this.ZonesArray[j].ZoneNumber + 'MUT')){
              this.ZonesArray[j].SetIsMuted(Response[5] === '1');

              if(this.CurrentState === ControllerState.Operation){
                this.emit('ZoneMutedChange', this.ZonesArray[j].ZoneNumber, j, this.ZonesArray[j].GetIsMuted());
              }
              break;
            }
          }

          // Set VolumePercentage
          for(let j = 0 ; j < this.ZonesArray.length ; j++){
            if(Response.substring(0, 6) === ('Z' + this.ZonesArray[j].ZoneNumber + 'PVOL')){
              this.ZonesArray[j].SetVolumePercentage(Number(Response.substring(6, Response.length)));
            }

            if(this.CurrentState === ControllerState.Operation){
              this.emit('ZoneVolumePercentageChange', this.ZonesArray[j].ZoneNumber, j, this.ZonesArray[j].GetVolumePercentage());
              break;
            }
          }

          // Set Volume
          for(let j = 0 ; j < this.ZonesArray.length ; j++){
            if(Response.substring(0, 5) === ('Z' + this.ZonesArray[j].ZoneNumber + 'VOL')){
              this.ZonesArray[j].SetVolume(Number(Response.substring(5, Response.length)));
            }
          }

          // Get Input Name
          if(Response.substring(0, 2) === 'IS'){
            const TempString = Response.substring(2, Response.length);
            // Find position of firs 'IN' in string
            for(let i = 0 ; i < Response.length-2; i++){
              if(TempString.substring(i, i+2) === 'IN'){
                const InputNumber = Number(TempString.substring(0, i));
                const Name = TempString.substring(i+2, TempString.length);

                this.InputNameArray[InputNumber-1] = Name;

                if(this.CurrentState === ControllerState.Operation){
                  if(InputNumber === this.InputNameArray.length){
                    if(this.GetInputHasChange()){
                      this.emit('InputChange', this.InputNameArray);
                    }
                  }
                  break;
                }
              }
            }
          }

          // Get Input Name from older dervice function
          if(Response.substring(0, 3) === 'ISN'){
            const InputNumber = Number(Response.substring(3, 5));
            const Name = Response.substring(5, Response.length);

            this.InputNameArray[InputNumber - 1] = Name;

            if(InputNumber === this.InputNameArray.length){
              if(this.GetInputHasChange()){
                this.emit('InputChange', this.InputNameArray);
              }
            }
          }

          // Get new actives inputs
          for(let j = 0 ; j < this.ZonesArray.length ; j++){
            if(Response.substring(0, 5) === ('Z' + this.ZonesArray[j].ZoneNumber + 'INP')){
              this.ZonesArray[j].SetActiveInput(Number(Response.substring(5, Response.length)));

              if(this.CurrentState === ControllerState.Operation){
                this.emit('ZoneInputChange', this.ZonesArray[j].ZoneNumber, j, this.ZonesArray[j].GetActiveInput());
              }
            }
          }

          // Get Config Menu Sate
          if(Response.substring(0, 5) === 'Z1SMD'){
            this.ConfigMenuDisplayVisible = Response[5] === '1';
          }

          // Error management
          if(Response.substring(0, 2) === '!E'){
          // Valid command, but cannot be executed
            this.emit('ControllerError', AnthemControllerError.CANNOT_EXECUTE_COMMAND, ': ' + Response.substring(2, Response.length));
          }

          // Error management
          if(Response.substring(0, 2) === '!R'){
            // Out of range parameter
            this.emit('ControllerError', AnthemControllerError.OUT_OF_RANGE_PARAMETER, ': ' + Response.substring(2, Response.length));
          }

          // Error management
          if(Response.substring(0, 2) === '!I'){
            // Invalid command
            this.emit('ControllerError', AnthemControllerError.INVALID_COMMAND, ': ' + Response.substring(2, Response.length));
          }

          // Error management
          if(Response.substring(0, 2) === '!Z'){
            // Invalid command
            this.emit('ControllerError', AnthemControllerError.ZONE_IS_NOT_POWERED, ': ' + Response.substring(2, Response.length));
          }

          // Check if all information has been received to become ready for operation
          if(this.CurrentState === ControllerState.Configure){
            if(this.ReceiverModel !== AnthemReceiverModel.Undefined
              && this.SoftwareVersion !== ''
              && this.SerialNumber !== ''
              && this.IsAllZoneConfigured()
            ){
              // Panel is configured, now ready for operation
              this.CurrentState = ControllerState.Operation;
              this.emit('ControllerReadyForOperation');

              // Start keep alice process (GetModel)
              this.SendKeepAlivePacket();


            }
          }
        }
      }
    }
}