import { getStatusMessage } from "./task.ts";

const statusNode = document.querySelector<HTMLParagraphElement>("#status-message");

if (!statusNode) {
  throw new Error('Expected #status-message element in parity fixture');
}

statusNode.textContent = getStatusMessage();
