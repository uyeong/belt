import Gear from './gear';

class Gears {
  private gears: Gear[];

  constructor(gears: Gear[] = []) {
    this.gears = gears;
  }

  public getAll() {
    return this.gears.slice();
  }
}

export default Gears;
