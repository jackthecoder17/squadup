import { describe, expect, it } from "vitest";

import { formatSSE } from "./sse";

describe("formatSSE", () => {
  it("emits a bare data frame terminated by a blank line", () => {
    expect(formatSSE({ kind: "presence", online: 3 })).toBe(
      'data: {"kind":"presence","online":3}\n\n',
    );
  });

  it("includes optional event and id fields in order", () => {
    expect(formatSSE({ a: 1 }, { event: "queue", id: "7" })).toBe(
      'id: 7\nevent: queue\ndata: {"a":1}\n\n',
    );
  });
});
