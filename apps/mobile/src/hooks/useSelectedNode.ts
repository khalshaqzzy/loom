/**
 * useSelectedNode.ts
 * Simple in-memory store untuk node yang sedang dipilih/terkoneksi.
 * Disimpan juga ke AsyncStorage untuk persist antar sesi.
 */

import { useState, useEffect } from 'react';
import { saveSelectedNode, getSelectedNode } from '../storage/localStore';
import { LoomNode } from '../ble/useBleScanner';

type NodeState = {
  node: LoomNode | null;
  isConnected: boolean;
};

// Module-level state agar bisa di-share antar screen tanpa context
let _globalNode: LoomNode | null = null;
let _globalConnected = false;
let _listeners: Array<(state: NodeState) => void> = [];

function notifyListeners() {
  const state = { node: _globalNode, isConnected: _globalConnected };
  _listeners.forEach(fn => fn(state));
}

export function setGlobalNode(node: LoomNode | null, connected: boolean) {
  _globalNode = node;
  _globalConnected = connected;
  if (node) {
    saveSelectedNode(node.id, node.name).catch(() => {});
  }
  notifyListeners();
}

export function useSelectedNode() {
  const [state, setState] = useState<NodeState>({
    node: _globalNode,
    isConnected: _globalConnected,
  });

  useEffect(() => {
    const listener = (newState: NodeState) => setState(newState);
    _listeners.push(listener);

    // Load from storage on first mount
    if (!_globalNode) {
      getSelectedNode().then(saved => {
        if (saved && !_globalNode) {
          _globalNode = { id: saved.nodeId, name: saved.nodeName, rssi: null, distance: 'jauh' };
          _globalConnected = false;
          notifyListeners();
        }
      });
    }

    return () => {
      _listeners = _listeners.filter(l => l !== listener);
    };
  }, []);

  return state;
}
