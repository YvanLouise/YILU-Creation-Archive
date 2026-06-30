let nextNavigationType = "history";

export function markDirectNavigation() {
  nextNavigationType = "direct";
}

export function consumeNavigationType() {
  const type = nextNavigationType;
  nextNavigationType = "history";
  return type;
}
