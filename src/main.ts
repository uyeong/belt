import EventEmitter3 from 'eventemitter3';

interface BeltOption {
  delay?: number;
  duration?: number;
  loop?: boolean;
  reverse?: boolean;
  round?: boolean;
  easing?: BeltEasingFn;
}

interface BeltListener {
  [eventName: string]: (...args: any[]) => void;
}

type BeltEasingFn = (n: number) => number;

const root = (typeof window === 'undefined' ? global : window) as Window;

function blender(easing: BeltEasingFn, reverse: boolean) {
  return (n: number) => (reverse ? 1 - easing(n) : easing(n));
}

class Belt {
  private delay: number;
  private duration: number;
  private loop: boolean;
  private reverse: boolean;
  private round: boolean;
  private easing: BeltEasingFn;
  private emitter: EventEmitter3;
  private startTime: number = 0;
  private pastTime: number = 0;
  private rafId: number = 0;

  constructor(option: BeltOption = {}) {
    this.emitter = new EventEmitter3();
    this.delay = option.delay ?? 0;
    this.duration = option.duration ?? 0;
    this.loop = option.loop ?? false;
    this.reverse = option.reverse ?? false;
    this.round = option.round ?? false;
    this.easing = option.easing ?? ((n: number) => n);
  }

  public option(): BeltOption;
  public option(key: BeltOption): void;
  public option<T extends keyof BeltOption>(key: T): BeltOption[T];
  public option<T extends keyof BeltOption>(key: T, value: BeltOption[T]): void;
  public option(key?: keyof BeltOption | BeltOption, value?: BeltOption[keyof BeltOption]): any {
    if (key === undefined && value === undefined) {
      return {
        delay: this.delay,
        duration: this.duration,
        loop: this.loop,
        reverse: this.reverse,
        round: this.round,
      };
    }
    if (typeof key === 'string' && value === undefined) {
      return this[key];
    }
    const currOption = this.option() as { [key: string]: any };
    const nextOption = { ...currOption };
    if (typeof key === 'string' && value !== undefined) {
      nextOption[key] = value;
    }
    if (typeof key === 'object' && key.constructor === Object) {
      for (const name in key /* key is BeltOption */) {
        if (key.hasOwnProperty(name)) {
          nextOption[name] = key[name as keyof BeltOption];
        }
      }
    }
    for (const prop in currOption) {
      if (currOption.hasOwnProperty(prop)) {
        if (currOption[prop] !== nextOption[prop]) {
          // @ts-ignore
          this[prop] = nextOption[prop];
          if (prop === 'reverse') {
            const timestamp = this.startTime + this.pastTime;
            const reversePastTime = this.duration * (1 - this.pastTime / this.duration);
            this.startTime = timestamp - reversePastTime;
          }
        }
      }
    }
  }

  public run() {
    this.pastTime = 0;
    this.startTime = 0;
    const stepping = (timestamp: number) => {
      if (!this.startTime) {
        this.startTime = timestamp - this.pastTime;
      }
      this.pastTime = timestamp - this.startTime;
      const progress = this.pastTime / this.duration;
      if (this.pastTime >= this.duration) {
        this.emitter.emit('update', blender(this.easing, this.reverse)(1));
        if (this.loop) {
          this.startTime = timestamp;
        } else {
          this.pastTime = 0;
          this.rafId = 0;
          return;
        }
      }
      this.emitter.emit('update', blender(this.easing, this.reverse)(progress));
      this.rafId = root.requestAnimationFrame(stepping);
    };
    root.requestAnimationFrame(stepping);
    return this;
  }

  public on(eventName: string | BeltListener, listener: (...args: any[]) => void, context?: any) {
    if (typeof eventName === 'object' && eventName.constructor === Object) {
      const listenerMap = eventName;
      for (const key in listenerMap) {
        if (listenerMap.hasOwnProperty(key)) {
          this.emitter.on(key, listenerMap[key]);
        }
      }
    }
    if (typeof eventName === 'string') {
      this.emitter.on(eventName, listener, context);
    }
    return this;
  }

  public off(eventName: string | BeltListener, listener: (...args: any[]) => void, context?: any) {
    if (typeof eventName === 'object' && eventName.constructor === Object) {
      const listenerMap = eventName;
      for (const key in listenerMap) {
        if (listenerMap.hasOwnProperty(key)) {
          this.emitter.off(key, listenerMap[key]);
        }
      }
    }
    if (typeof eventName === 'string') {
      this.emitter.off(eventName, listener, context);
    }
    return this;
  }
}

export default Belt;
