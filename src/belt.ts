import EventEmitter, { ListenerFn } from 'eventemitter3';
import diff from './utils/diff';
import isEmpty from './utils/isEmpty';
import Shaft from './shaft';
import Gear, { Option as GearOption } from './gear';

interface Option {
  duration: number;
  loop: boolean;
  reverse: boolean;
  round: boolean;
}

const defaultOption = {
  duration: 0,
  loop: false,
  reverse: false,
  round: false,
};

interface FrameData {
  pastTime: number;
  progress: number;
  isForward: boolean;
}

interface EventList {
  start: [];
  update: [number];
  pause: [];
  stop: [];
  done: [];
}

const root = (typeof window === 'undefined' ? global : window) as Window;

function belt(option?: Partial<Option>, gears?: Gear[]) {
  return new Belt(option, gears);
}

function gear(option?: Partial<GearOption>) {
  return new Gear(option);
}

class Belt {
  public static belt = belt;
  public static gear = gear;
  public static Gear = Gear;
  private emitter: EventEmitter<EventList> = new EventEmitter();
  private shaft: Shaft;
  // option variable(s).
  private duration: number;
  private loop: boolean;
  private reverse: boolean;
  private round: boolean;
  // state variable(s).
  private paused: boolean = true;
  // switch variable(s).
  private turn: boolean = false;
  // raf's variable(s).
  private timestamp: number = 0;
  private startTime: number = 0;
  private pastTime: number = 0;
  private rafId: number = 0;

  constructor(option: Partial<Option> = {}, gears: Gear[] = []) {
    const { duration, loop, reverse, round } = { ...defaultOption, ...option };
    this.duration = Math.max(Shaft.duration(gears), duration);
    this.loop = loop;
    this.reverse = reverse;
    this.round = round;
    this.shaft = new Shaft(gears, this);
  }

  public isPaused() {
    return this.paused;
  }

  public option(): Option;
  public option<K extends keyof Option>(key: K): Option[K];
  public option(key: Partial<Option>): this;
  public option<K extends keyof Option>(key: K, value: Option[K]): this;
  public option<K extends keyof Option>(key?: K | Partial<Option>, value?: Option[K]) {
    if (key === undefined && value === undefined) {
      return {
        duration: this.duration,
        loop: this.loop,
        reverse: this.reverse,
        round: this.round,
      };
    }
    if (typeof key === 'string' && value === undefined) {
      // @ts-ignore
      return this[key];
    }
    let newOption = key as Partial<Option>;
    if (typeof key === 'string') {
      newOption = { [key]: value };
    }
    if (newOption.hasOwnProperty('duration')) {
      newOption.duration = Math.max(this.shaft.duration(), newOption.duration!);
    }
    const prevOption = this.option();
    const changeOption = diff<Option>(prevOption, newOption);
    if (!isEmpty(changeOption)) {
      for (const prop in changeOption) {
        if (changeOption.hasOwnProperty(prop)) {
          // @ts-ignore
          this[prop] = changeOption[prop];
        }
      }
      if (changeOption.hasOwnProperty('duration')) {
        this.shaft.calculate();
      }
      if (!this.paused || this.pastTime > 0) {
        this.updateTime(changeOption, prevOption);
      }
    }
    return this;
  }

  public start() {
    if (this.duration === 0 || !this.paused) {
      return this;
    }
    this.startTime = 0;
    const stepping = (timestamp: number) => {
      if (!this.startTime) {
        this.startTime = timestamp - this.pastTime;
      }
      this.timestamp = timestamp;
      this.pastTime = timestamp - this.startTime;
      const frameData = this.getFrameData();
      if (this.pastTime >= this.duration) {
        this.emitter.emit('update', frameData.progress);
        this.shaft.update(frameData);
        if (this.loop || (this.round && !this.turn)) {
          this.startTime = timestamp;
          if (this.round) {
            this.turn = !this.turn;
          }
        } else {
          this.pastTime = 0;
          this.rafId = 0;
          this.paused = true;
          this.turn = false;
          this.emitter.emit('done');
          return;
        }
      } else {
        this.emitter.emit('update', frameData.progress);
        this.shaft.update(frameData);
      }
      this.rafId = root.requestAnimationFrame(stepping);
    };
    this.rafId = root.requestAnimationFrame(stepping);
    this.paused = false;
    this.emitter.emit('start');
    return this;
  }

  public pause() {
    if (this.paused) {
      return this;
    }
    window.cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.paused = true;
    this.emitter.emit('pause');
    return this;
  }

  public stop() {
    if (this.paused && this.pastTime === 0) {
      return this;
    }
    window.cancelAnimationFrame(this.rafId);
    this.pastTime = 0;
    this.rafId = 0;
    this.paused = true;
    this.turn = false;
    this.emitter.emit('stop');
    return this;
  }

  public on<K extends keyof EventList>(eventName: K, listener: ListenerFn<EventList[K]>, context?: any) {
    this.emitter.on(eventName, listener, context);
    return this;
  }

  public once<K extends keyof EventList>(eventName: K, listener: ListenerFn<EventList[K]>, context?: any) {
    this.emitter.once(eventName, listener, context);
    return this;
  }

  public off<K extends keyof EventList>(eventName: K, listener: ListenerFn<EventList[K]>, context?: any, once?: boolean) {
    this.emitter.off(eventName, listener, context, once);
    return this;
  }

  private getFrameData(): FrameData {
    const progress = Math.min(1, this.pastTime / this.duration);
    const isForward = (!this.reverse && !this.turn) || (this.reverse && this.turn);
    return {
      isForward,
      pastTime: this.pastTime,
      progress: isForward ? progress : 1 - progress,
    };
  }

  private updateTime(changeOption: Partial<Option>, prevOption: Option) {
    if (changeOption.hasOwnProperty('duration')) {
      this.pastTime = this.duration * (this.pastTime / prevOption.duration);
      this.startTime = this.timestamp - this.pastTime;
    }
    if (changeOption.hasOwnProperty('reverse')) {
      this.pastTime = this.pastTime > 0 ? this.duration * (1 - this.pastTime / this.duration) : 0;
      this.startTime = this.timestamp - this.pastTime;
    }
  }
}

export default Belt;
export { Option as BeltOption, FrameData, GearOption };
