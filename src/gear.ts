import EventEmitter, { ListenerFn } from 'eventemitter3';
import diff from './utils/diff';
import isEmpty from './utils/isEmpty';

interface Option {
  delay: number;
  duration: number;
}

const defaultOption = {
  delay: 0,
  duration: 0,
};

interface EventList {
  start: [];
  update: [number];
  pause: [];
  stop: [];
  done: [];
}

class Gear {
  private emitter: EventEmitter<EventList> = new EventEmitter();
  // option variable(s).
  private delay: number;
  private duration: number;
  // state variable(s).
  private paused = true;

  constructor(option: Partial<Option> = {}) {
    const { delay, duration } = { ...defaultOption, ...option };
    this.delay = delay;
    this.duration = duration;
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
        delay: this.delay,
        duration: this.duration,
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
    const prevOption = this.option();
    const changeOption = diff<Option>(prevOption, newOption);
    if (!isEmpty(changeOption)) {
      for (const prop in changeOption) {
        if (changeOption.hasOwnProperty(prop)) {
          // @ts-ignore
          this[prop] = changeOption[prop];
        }
      }
    }
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
}

class Hub {
  // state variable(s).
  private stopped = true;
  // time variable(s).
  private fWait = 0;
  private rWait = 0;

  constructor(private gear: Gear) {}

  public isPaused() {
    return this.gear['paused'];
  }

  public option(): Option;
  public option<K extends keyof Option>(key: K): Option[K];
  public option(key: Partial<Option>): this;
  public option<K extends keyof Option>(key: K, value: Option[K]): this;
  public option<K extends keyof Option>(key?: K | Partial<Option>, value?: Option[K]) {
    // @ts-ignore
    const result = this.gear.option(key, value);
    return result !== this.gear ? result : this;
  }

  public forwardWait(): number;
  public forwardWait(time: number): this;
  public forwardWait(time?: number) {
    if (time === undefined) {
      return this.fWait;
    }
    this.fWait = time;
    return this;
  }

  public reverseWait(): number;
  public reverseWait(time: number): this;
  public reverseWait(time?: number) {
    if (time === undefined) {
      return this.rWait;
    }
    this.rWait = time;
    return this;
  }

  public start() {
    if (!this.gear['paused']) {
      return this;
    }
    this.stopped = false;
    this.gear['paused'] = false;
    this.gear['emitter'].emit('start');
    return this;
  }

  public update(progress: number) {
    if (this.gear['paused']) {
      return this;
    }
    this.gear['emitter'].emit('update', progress);
    return this;
  }

  public pause() {
    if (this.gear['paused']) {
      return this;
    }
    this.gear['paused'] = true;
    this.gear['emitter'].emit('pause');
    return this;
  }

  public stop() {
    if (this.stopped) {
      return this;
    }
    this.stopped = true;
    this.gear['paused'] = true;
    this.gear['emitter'].emit('stop');
    return this;
  }

  public done() {
    if (this.gear['paused']) {
      return this;
    }
    this.stopped = true;
    this.gear['paused'] = true;
    this.gear['emitter'].emit('done');
    return this;
  }
}

export default Gear;
export { Hub, Option, EventList };
