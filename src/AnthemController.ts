import { TypedEmitter } from 'tiny-typed-emitter';
import net = require('net');

export interface AnthemControllerEvent {
    'ControllerReadyForOperation': () => void;
    'ZonePowerChange': (Zone: number, ZoneIndex: number, Power: boolean) => void;
    'ZoneInputChange': (Zone: number, ZoneIndex: number, Input: number) => void;
    'InputNameChange':(Input: number, Name: string) => void;
    'ControllerError': (Error: AnthemControllerError, ErrorString: string) => void;
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

  enum ControllerState {
    Idle,
    GetModelFromReceiver,
    Configure,
    Operation,
  }

export enum AnthemControllerError {
    CONNECTION_ERROR = 'Controller Connection Error',
    ZONE_IS_NOT_POWERED = 'Zone is not powered',
    COMMAND_NOT_SUPPORTED = 'Command is not supported by receiver',
    RECEIVER_NOT_READY = 'Receiver not ready for operation',
    INVALID_MODEL_STRING_RECEIVED = 'Received and invalid model string from receiver'
  }

export class AnthemController extends TypedEmitter<AnthemControllerEvent> {

    private Host: string;
    private Port: number;
    private Client = new net.Socket();
    private CurrentState = ControllerState.Idle;
    private CommandArray: string[] = [];
    private ZoneArray: number[] = [];
    private ZoneNameArray: string[] = [];
    private ZoneActiveInputArray: number[] = [];
    private ZoneIsPoweredArray: boolean[] = [];
    private InputNameArray:string[] = [];

    SerialNumber = '';
    SoftwareVersion = '';
    ReceiverModel = AnthemReceiverModel.Undefined;

    constructor(Host: string, Port:number) {
      super();
      this.Host = Host;
      this.Port = Port;

      this.Client.on('data', (data) => {
        this.AnalyseResponse(data);
      });

      this.Client.on('error', (err) =>{
        this.emit('ControllerError', AnthemControllerError.CONNECTION_ERROR, err.message);
      });
    }

    Connect(){
      this.ZoneIsPoweredArray = new Array(this.ZoneArray.length);
      this.ZoneActiveInputArray = new Array(this.ZoneArray.length);

      this.Client.connect(this.Port, this.Host, () => {
        this.GetModel();
      });
    }

    AddControllingZone(NewZone: number, ZoneName: string) {
      // We can only add a new zone while the controller is being configured
      if(this.CurrentState !== ControllerState.Idle){
        return false;
      }

      // Check if zone is 1 or 2;
      if(NewZone !== 1 && NewZone !== 2){
        return false;
      }

      // Cannot add a duplicate zone.
      if(this.ZoneArray.indexOf(NewZone) !== -1){
        return false;
      }
      this.ZoneArray.push(NewZone);
      this.ZoneNameArray.push(ZoneName);
      return true;
    }

    GetZone(ZoneIndex: number){
      return this.ZoneArray[ZoneIndex];7274;
    }

    GetZoneIndex(Zone: number){
      return this.ZoneArray.indexOf(Zone);
    }

    GetZoneName(ZoneIndex: number){
      return this.ZoneNameArray[ZoneIndex];
    }

    GetConfiguredZoneNumber(){
      return this.ZoneArray.length;
    }

    GetActiveInputForZoneIndex(Index: number){
      return this.ZoneActiveInputArray[Index];
    }

    GetNumberOfInput(){
      return this.InputNameArray.length;
    }

    //
    // Function GetInputName()
    //
    GetInputName(Input: number){
      return this.InputNameArray[Input];
    }

    //
    // Function for communication with receiver
    //
    // Not all functions are available for all receiver model

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
      this.Client.write(CommandString);
      this.CommandArray = [];
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
    // Function GetSerialNumberFromReceiver()
    // Get serial number from receiver
    //
    // Availability: MRX 540, MRX 740, MRX 1140
    private GetSerialNumberFromReceiver(){

      // Check if command is supported on this receiver
      const SupportedDevice = [
        AnthemReceiverModel.MRX540,
        AnthemReceiverModel.MRX740,
        AnthemReceiverModel.MRX1140,
        AnthemReceiverModel.AVM70,
        AnthemReceiverModel.AVM90,
      ];

      if(SupportedDevice.indexOf(this.ReceiverModel) === -1){
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
    // Availability: MRX 310, MRX 510, MRX 710, MRX 520, MRX 720, MRX 1120, AVM 60
    GetMACAddress(){

      const SupportedDevice = [
        AnthemReceiverModel.MRX310,
        AnthemReceiverModel.MRX510,
        AnthemReceiverModel.MRX710,
        AnthemReceiverModel.MRX520,
        AnthemReceiverModel.MRX720,
        AnthemReceiverModel.MRX1120,
        AnthemReceiverModel.AVM60,
      ];

      if(SupportedDevice.indexOf(this.ReceiverModel) === -1){
        this.CurrentState = ControllerState.Idle;
        this.emit('ControllerError', AnthemControllerError.COMMAND_NOT_SUPPORTED, 'GetMACAddress (IDN?)' );
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
      this.QueueCommand('Z' + this.ZoneArray[ZoneIndex] + 'POW?');
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
    // Availability: MRX 540, MRX 740, MRX 1140
    private GetInputsNameFromReceiver(){

      const SupportedDevice = [
        AnthemReceiverModel.MRX540,
        AnthemReceiverModel.MRX740,
        AnthemReceiverModel.MRX1140,
        AnthemReceiverModel.AVM70,
        AnthemReceiverModel.AVM90,
      ];


      if(SupportedDevice.indexOf(this.ReceiverModel) === -1){
        this.CurrentState = ControllerState.Idle;
        this.emit('ControllerError', AnthemControllerError.COMMAND_NOT_SUPPORTED, 'GetInputName (ISzIN?)');
        return;
      }

      for(let i = 1 ; i <= this.InputNameArray.length ; i++){
        this.QueueCommand('IS' + i +'IN?');
      }
      this.SendCommand();
    }

    //
    // Function GetInputsNameFromReceiver_OLD()
    // Get all input names from receiver
    //
    private GetInputsNameFromReceiver_OLD(){

      const SupportedDevice = [
        AnthemReceiverModel.MRX310,
        AnthemReceiverModel.MRX510,
        AnthemReceiverModel.MRX710,
        AnthemReceiverModel.MRX520,
        AnthemReceiverModel.MRX720,
        AnthemReceiverModel.MRX1120,
        AnthemReceiverModel.AVM60,
      ];


      if(SupportedDevice.indexOf(this.ReceiverModel) === -1){
        this.CurrentState = ControllerState.Idle;
        this.emit('ControllerError', AnthemControllerError.COMMAND_NOT_SUPPORTED, 'GetInputName (ISNyy?)');
        return;
      }

      for(let i = 1 ; i <= this.InputNameArray.length ; i++){
        this.QueueCommand('ISN' + this.InputNameArray[i] + '?');
      }
      this.SendCommand();
    }

    //
    // Function GetZoneActiveInputFromReceiver()
    // Get input name from receiver
    //
    // Availability: All model
    private GetZoneActiveInputFromReceiver(ZoneIndex:number){
      this.QueueCommand('Z' + this.ZoneArray[ZoneIndex] + 'INP?');
    }

    //
    // Function SetZoneInput()
    // Set Zone active input
    //
    // Availability: All model
    SetZoneInput(ZoneIndex: number, InputNumber: number){

      this.QueueCommand('Z' + this.ZoneArray[ZoneIndex] + 'INP' + InputNumber);
      this.SendCommand();
    }

    IsAllZonePowerConfigured(){
      for(let i = 0 ; i < this.ZoneArray.length ; i++){
        if(this.ZoneIsPoweredArray[i] === undefined){
          return false;
        }
      }
      return true;
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
        this.QueueCommand('Z' + this.ZoneArray[ZoneIndex] + 'POW1');
      } else{
        this.QueueCommand('Z' + this.ZoneArray[ZoneIndex] + 'POW0');
      }
      this.SendCommand();
    }

    //
    // Function GetZonePower()
    // Get Zone power status
    //
    GetZonePower(ZoneIndex: number){
      return this.ZoneIsPoweredArray[ZoneIndex];
    }

    //
    // Function SetModel
    // Set receiver model from string received from receiver
    //
    private SetModel(ModelString: string){
      for(let i = 0 ; i < AllAnthemReceiverModel.length ; i++){
        if(ModelString === AllAnthemReceiverModel[i]){
          // Found a maatch
          this.ReceiverModel = AllAnthemReceiverModel[i];
          return;
        }
      }

      // No match.
      // For debug purpose, asssume model MRX 740
      this.emit('ControllerError', AnthemControllerError.INVALID_MODEL_STRING_RECEIVED, ModelString);
      this.ReceiverModel = AnthemReceiverModel.MRX740;
    }

    //
    // Function GetModel
    // First step for controller configuration
    // Need to get model from receiver to send proper command format afterward.
    private GetModel(){
      this.CurrentState = ControllerState.GetModelFromReceiver;
      this.GetModelFromReceiver();
      this.SendCommand();
    }

    //
    // Function Configure
    // Second step for controller configuration
    // Need to get model from receiver to send proper command format afterward.
    private Configure(){
      this.CurrentState = ControllerState.Configure;
      this.GetsoftwareVersionFromReceiver();

      // MRX 540, 740 and 1140 support GetSerialNumber
      // Other model only support GetMACAdress. Usin MAC address
      // as serial number for those models.
      const SupportedDevice = [
        AnthemReceiverModel.MRX540,
        AnthemReceiverModel.MRX740,
        AnthemReceiverModel.MRX1140,
        AnthemReceiverModel.AVM70,
        AnthemReceiverModel.AVM90,
      ];

      if(SupportedDevice.indexOf(this.ReceiverModel) !== -1 ){
        this.GetSerialNumberFromReceiver();
      } else{
        this.GetMACAddress();
      }

      for(let i = 0 ; i < this.ZoneArray.length ; i ++ ){
        this.GetIsZonePoweredFromReceiver(i);
        this.GetZoneActiveInputFromReceiver(i);
      }

      this.GetNumberOfInputFromReceiver();
      this.SendCommand();
    }

    private AnalyseResponse(Data: Buffer){
      const SplitString = Data.toString().split(';');

      for(let i = 0 ; i < SplitString.length - 1 ; i ++){
        const Response = SplitString[i];
        if(Response.length !== 0){

          // Get Device Model
          if(this.CurrentState === ControllerState.GetModelFromReceiver){
            if(Response.substring(0, 3) === 'IDM'){
              this.SetModel(Response.substring(3, Response.length));
              this.CurrentState = ControllerState.Configure;
              this.Configure();
            }
          }

          // Get Serial Number
          if(Response.substring(0, 3) === 'GSN'){
            this.SerialNumber = Response.substring(3, Response.length);
          }

          // Get Mac Address
          // For older models, use MAC address a serial number
          if(Response.substring(0, 3) === 'IDN'){
            this.SoftwareVersion = Response.substring(3, Response.length);
          }

          // Get software version
          if(Response.substring(0, 3) === 'IDS'){
            this.SoftwareVersion = Response.substring(3, Response.length);
          }

          // Get number of input
          if(Response.substring(0, 3) === 'ICN'){
            this.InputNameArray = new Array(Number(Response[3]));

            const SupportedDevice = [
              AnthemReceiverModel.MRX540,
              AnthemReceiverModel.MRX740,
              AnthemReceiverModel.MRX1140,
              AnthemReceiverModel.AVM70,
              AnthemReceiverModel.AVM90,
            ];

            if(SupportedDevice.indexOf(this.ReceiverModel) !== -1 ){
              this.GetInputsNameFromReceiver();
            } else{
              this.GetInputsNameFromReceiver_OLD();
            }
          }

          // Get Zone power status
          for(let j = 0 ; j < this.ZoneArray.length ; j++){

            if(Response.substring(0, 5) === ('Z' + this.ZoneArray[j] + 'POW')){
              this.ZoneIsPoweredArray[j] = (Response[5] === '1');
            }

            if(this.CurrentState === ControllerState.Operation){
              this.emit('ZonePowerChange', this.ZoneArray[j], j, this.ZoneIsPoweredArray[j]);
            }
          }

          // Get Input Name
          if(Response.substring(0, 2) === 'IS' && Response.substring(3, 5) === 'IN'){
            const input = Response[2];
            // test to make sure input is valid

            const name = Response.substring(5, Response.length);
            this.InputNameArray[Number(input) - 1] = name;

            if(this.CurrentState === ControllerState.Operation){
              this.emit('InputNameChange', Number(input), name);
            }
          }

          // Get Input Name from older dervice function
          if(Response.substring(0, 3) === 'ISN'){
            const input = Response[3];
            const name = Response.substring(4, Response.length);
            this.InputNameArray[Number(input) - 1] = name;
            if(this.CurrentState === ControllerState.Operation){
              this.emit('InputNameChange', Number(input), name);
            }

          }

          // Get new actives inputs
          for(let j = 0 ; j < this.ZoneArray.length ; j++){
            if(Response.substring(0, 5) === ('Z' + this.ZoneArray[j] + 'INP')){
              this.ZoneActiveInputArray[j] = Number(Response[5]);
              if(this.CurrentState === ControllerState.Operation){
                this.emit('ZoneInputChange', this.ZoneArray[j], j, this.ZoneActiveInputArray[j]);
              }
            }
          }

          // Checf if all information has been received to become ready for operatioin
          if(this.CurrentState === ControllerState.Configure){
            if(this.ReceiverModel !== AnthemReceiverModel.Undefined
              && this.SoftwareVersion !== ''
              && this.SerialNumber !== ''
              && this.IsAllZonePowerConfigured()
              && this.IsAllInputConfigured() ){

              // Panel is configured, now ready for operation
              this.CurrentState = ControllerState.Operation;
              this.emit('ControllerReadyForOperation');
            }
          }
        }
      }
    }
}