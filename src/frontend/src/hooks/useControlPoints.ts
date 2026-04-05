import { useCallback, useState } from "react";
import type { ControlPoint } from "../utils/wld3";

export type PickingState = "idle" | "waiting-cad" | "waiting-map";

export interface UseControlPointsReturn {
  points: ControlPoint[];
  pickingState: PickingState;
  pendingCadCoord: { x: number; y: number } | null;
  isAddMode: boolean;
  startAddMode: () => void;
  stopAddMode: () => void;
  /** @deprecated use startAddMode */
  startAddPoint: () => void;
  /** @deprecated use stopAddMode */
  cancelAddPoint: () => void;
  onCadClick: (x: number, y: number) => void;
  onMapClick: (lat: number, lng: number) => void;
  updateMapPoint: (id: number, lat: number, lng: number) => void;
  onUpdateAllMapPoints: (
    updater: (pts: ControlPoint[]) => ControlPoint[],
  ) => void;
  deletePoint: (id: number) => void;
  undoLastPoint: () => void;
  clearAll: () => void;
}

/** Returns the lowest positive integer not currently used as a point ID. */
function getNextAvailableId(pts: ControlPoint[]): number {
  const used = new Set(pts.map((p) => p.id));
  let id = 1;
  while (used.has(id)) id++;
  return id;
}

export function useControlPoints(): UseControlPointsReturn {
  const [points, setPoints] = useState<ControlPoint[]>([]);
  const [pickingState, setPickingState] = useState<PickingState>("idle");
  const [pendingCadCoord, setPendingCadCoord] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);

  const startAddMode = useCallback(() => {
    setIsAddMode(true);
    setPickingState("waiting-cad");
    setPendingCadCoord(null);
  }, []);

  const stopAddMode = useCallback(() => {
    setIsAddMode(false);
    setPickingState("idle");
    setPendingCadCoord(null);
  }, []);

  const onCadClick = useCallback(
    (x: number, y: number) => {
      if (pickingState !== "waiting-cad") return;
      setPendingCadCoord({ x, y });
      setPickingState("waiting-map");
    },
    [pickingState],
  );

  const onMapClick = useCallback(
    (lat: number, lng: number) => {
      if (pickingState !== "waiting-map" || !pendingCadCoord) return;
      setPoints((prev) => {
        const newId = getNextAvailableId(prev);
        const newPoint: ControlPoint = {
          id: newId,
          cadX: pendingCadCoord.x,
          cadY: pendingCadCoord.y,
          mapLat: lat,
          mapLng: lng,
        };
        return [...prev, newPoint];
      });
      setPendingCadCoord(null);
      setIsAddMode((currentAddMode) => {
        if (currentAddMode) {
          setPickingState("waiting-cad");
        } else {
          setPickingState("idle");
        }
        return currentAddMode;
      });
    },
    [pickingState, pendingCadCoord],
  );

  const updateMapPoint = useCallback((id: number, lat: number, lng: number) => {
    setPoints((prev) =>
      prev.map((p) => (p.id === id ? { ...p, mapLat: lat, mapLng: lng } : p)),
    );
  }, []);

  const onUpdateAllMapPoints = useCallback(
    (updater: (pts: ControlPoint[]) => ControlPoint[]) => {
      setPoints((prev) => updater(prev));
    },
    [],
  );

  const deletePoint = useCallback((id: number) => {
    setPoints((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const undoLastPoint = useCallback(() => {
    setPoints((prev) => {
      if (prev.length === 0) return prev;
      return prev.slice(0, -1);
    });
    // Cancel any pending pick state
    setPendingCadCoord(null);
    setPickingState((ps) => (ps === "waiting-map" ? "waiting-cad" : ps));
  }, []);

  const clearAll = useCallback(() => {
    setPoints([]);
    setPickingState("idle");
    setPendingCadCoord(null);
    setIsAddMode(false);
  }, []);

  return {
    points,
    pickingState,
    pendingCadCoord,
    isAddMode,
    startAddMode,
    stopAddMode,
    startAddPoint: startAddMode,
    cancelAddPoint: stopAddMode,
    onCadClick,
    onMapClick,
    updateMapPoint,
    onUpdateAllMapPoints,
    deletePoint,
    undoLastPoint,
    clearAll,
  };
}
