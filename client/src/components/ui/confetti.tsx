import confetti from "canvas-confetti";

type ConfettiOptions = confetti.Options & {
  canvas?: HTMLCanvasElement;
  resize?: boolean;
  useWorker?: boolean;
  disableForReducedMotion?: boolean;
};

const Confetti = (options: ConfettiOptions) => {
  if (
    options.disableForReducedMotion &&
    window.matchMedia("(prefers-reduced-motion)").matches
  ) {
    return;
  }

  const confettiInstance = options.canvas
    ? confetti.create(options.canvas, {
        resize: options.resize ?? true,
        useWorker: options.useWorker ?? true,
      })
    : confetti;

  confettiInstance({
    ...options,
  });
};

Confetti.shapeFromPath = (options: { path: string; matrix?: DOMMatrix }) => {
  return confetti.shapeFromPath({ ...options });
};

Confetti.shapeFromText = (options: {
  text: string;
  scalar?: number;
  color?: string;
  fontFamily?: string;
}) => {
  return confetti.shapeFromText({ ...options });
};

export { Confetti };
