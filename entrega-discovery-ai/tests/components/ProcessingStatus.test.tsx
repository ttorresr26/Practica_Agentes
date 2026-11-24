import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProcessingStatus from "../../src/components/ProcessingStatus";

describe("ProcessingStatus", () => {
  it("shows progress and identifies the active processing stage", () => {
    render(<ProcessingStatus stage="evidence" completedStages={["structure"]} />);

    expect(screen.getByRole("status")).toHaveTextContent(/analizando el problema y la evidencia/i);
    expect(screen.getByRole("listitem", { name: /analizando el problema y la evidencia/i })).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(screen.getByRole("listitem", { name: /estructurando la demanda/i })).toHaveAttribute(
      "data-complete",
      "true",
    );
  });
});
