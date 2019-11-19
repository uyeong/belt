import EventEmitter from 'eventemitter3';

class PropM<T extends {}> {
  private emitter: EventEmitter = new EventEmitter();
  private props: T;

  constructor(props: Partial<T> = {}, defaultProps: T) {
    this.props = { ...defaultProps, ...props } as T;
  }

  public listen(listener: (changedProps: Partial<T>, prevProps: T, nextProps: T) => void, context?: any) {
    this.emitter.on('update', listener, context);
  }

  public all(): T {
    return { ...this.props };
  }

  public get<P extends keyof T>(key: P): T[P];
  public get<P extends keyof T>(key?: P): undefined;
  public get<P extends keyof T>(key?: P): T[P] | undefined {
    if (key !== undefined) {
      return this.props[key];
    }
  }

  public set<P extends keyof T>(key: P, value: T[P]) {
    if (!key || value === undefined || this.get(key) === value) {
      return;
    }
    const currProps = this.all();
    const nextProps = { ...currProps, [key]: value };
    const changedProps = { [key]: value };
    this.props = nextProps;
    this.emitter.emit('update', changedProps, currProps, nextProps);
  }

  public merge(props: Partial<T>) {
    if (JSON.stringify(props) === '{}') {
      return;
    }
    const currProps = this.all();
    const nextProps = { ...currProps, ...props };
    const changedProps = {} as Partial<T>;
    let key: keyof T;
    for (key in currProps) {
      if (currProps.hasOwnProperty(key) && currProps[key] !== nextProps[key]) {
        changedProps[key] = nextProps[key];
      }
    }
    if (JSON.stringify(changedProps) !== '{}') {
      this.props = nextProps;
      this.emitter.emit('update', changedProps, currProps, nextProps);
    }
  }
}

export default PropM;
