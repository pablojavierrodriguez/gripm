import { useState, useMemo } from 'react';
import type { GripmConfig } from '../../types';

export function useFormChips(config?: GripmConfig, availableModules: string[] = []) {
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [moduleInput, setModuleInput] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState('');
  const [assignees, setAssignees] = useState<string[]>([]);
  const [assigneeInput, setAssigneeInput] = useState('');

  const allCandidateModules = useMemo(() => {
    const set = new Set<string>();
    if (config?.modulesList) {
      config.modulesList.forEach((m) => {
        if (m && m.trim()) set.add(m.trim());
      });
    }
    if (availableModules) {
      availableModules.forEach((m) => {
        if (m && m.trim()) set.add(m.trim());
      });
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [config?.modulesList, availableModules]);

  const handleAddModule = (val?: string) => {
    const raw = (val !== undefined ? val : moduleInput).trim();
    if (!raw) return;
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    const next = Array.from(new Set([...selectedModules, ...parts]));
    setSelectedModules(next);
    setModuleInput('');
  };

  const handleRemoveModule = (modToRemove: string) => {
    setSelectedModules(selectedModules.filter((m) => m !== modToRemove));
  };

  const handleAddLabel = (val?: string) => {
    const raw = (val !== undefined ? val : labelInput).trim();
    if (!raw) return;
    const parts = raw.split(',').map((s) => s.trim().toLowerCase().replace(/^#/, '')).filter(Boolean);
    const newLabels = Array.from(new Set([...labels, ...parts]));
    setLabels(newLabels);
    setLabelInput('');
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    setLabels(labels.filter((l) => l !== labelToRemove));
  };

  const handleAddAssignee = (val?: string) => {
    const raw = (val !== undefined ? val : assigneeInput).trim();
    if (!raw) return;
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    const newAssignees = Array.from(new Set([...assignees, ...parts]));
    setAssignees(newAssignees);
    setAssigneeInput('');
  };

  const handleRemoveAssignee = (assigneeToRemove: string) => {
    setAssignees(assignees.filter((a) => a !== assigneeToRemove));
  };

  return {
    selectedModules,
    setSelectedModules,
    moduleInput,
    setModuleInput,
    labels,
    setLabels,
    labelInput,
    setLabelInput,
    assignees,
    setAssignees,
    assigneeInput,
    setAssigneeInput,
    allCandidateModules,
    handleAddModule,
    handleRemoveModule,
    handleAddLabel,
    handleRemoveLabel,
    handleAddAssignee,
    handleRemoveAssignee,
  };
}
