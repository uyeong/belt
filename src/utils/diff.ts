function diff<T extends {}>(currentObject: Partial<T>, newObject: Partial<T>): Partial<T> {
  const result = {} as Partial<T>;
  for (const key in newObject) {
    if (newObject.hasOwnProperty(key) && currentObject[key] !== newObject[key]) {
      result[key] = newObject[key];
    }
  }
  return result;
}

export default diff;
