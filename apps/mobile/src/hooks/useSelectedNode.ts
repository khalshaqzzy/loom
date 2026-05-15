import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BleNodeStatus } from '@loom/contracts';
import type { DiscoveredNode } from '../ble/client';

const NODE_KEY = '@loom_validated_node';

export type SelectedNode = DiscoveredNode & {
  nodeId: number;
  validated: boolean;
  status?: BleNodeStatus | null;
};

type NodeState = {
  node: SelectedNode | null;
  isConnected: boolean;
};

let globalNode: SelectedNode | null = null;
let globalConnected = false;
let listeners: Array<(state: NodeState) => void> = [];

const notifyListeners = () => {
  const state = { node: globalNode, isConnected: globalConnected };
  listeners.forEach((listener) => listener(state));
};

export const setGlobalNode = (node: SelectedNode | null, connected: boolean): void => {
  globalNode = node;
  globalConnected = connected;

  if (node) {
    AsyncStorage.setItem(
      NODE_KEY,
      JSON.stringify({
        deviceId: node.deviceId,
        name: node.name,
        nodeId: node.nodeId
      })
    ).catch(() => {});
  }

  notifyListeners();
};

export const updateGlobalNodeStatus = (status: BleNodeStatus): void => {
  if (!globalNode) return;
  globalNode = { ...globalNode, status };
  notifyListeners();
};

export const useSelectedNode = (): NodeState => {
  const [state, setState] = useState<NodeState>({
    node: globalNode,
    isConnected: globalConnected
  });

  useEffect(() => {
    listeners.push(setState);

    if (!globalNode) {
      AsyncStorage.getItem(NODE_KEY)
        .then((saved) => {
          if (!saved || globalNode) return;
          const parsed = JSON.parse(saved) as { deviceId: string; name: string; nodeId: number };
          globalNode = {
            deviceId: parsed.deviceId,
            name: parsed.name,
            nodeId: parsed.nodeId,
            validated: false,
            rssi: null,
            distance: 'jauh'
          };
          globalConnected = false;
          notifyListeners();
        })
        .catch(() => {});
    }

    return () => {
      listeners = listeners.filter((listener) => listener !== setState);
    };
  }, []);

  return state;
};
