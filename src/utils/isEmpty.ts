function isEmpty<T extends {}>(obj: T) {
  for (const prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      return false;
    }
  }
  return JSON.stringify(obj) === '{}';
}

export default isEmpty;
