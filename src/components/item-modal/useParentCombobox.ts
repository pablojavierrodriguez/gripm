import { useState, useRef, useEffect, useMemo } from 'react';
import type { BacklogItem } from '../../types';

export function useParentCombobox(candidateParents: BacklogItem[]) {
  const [parentSearchQuery, setParentSearchQuery] = useState('');
  const [isParentDropdownOpen, setIsParentDropdownOpen] = useState(false);
  const parentDropdownContainerRef = useRef<HTMLDivElement>(null);
  const parentSearchInputRef = useRef<HTMLInputElement>(null);

  const filteredCandidateParents = useMemo(() => {
    if (!parentSearchQuery.trim()) return candidateParents;
    const q = parentSearchQuery.trim().toLowerCase();
    return candidateParents.filter((cand) => {
      const codeMatch = (cand.code || cand.id || '').toLowerCase().includes(q);
      const titleMatch = (cand.title || '').toLowerCase().includes(q);
      return codeMatch || titleMatch;
    });
  }, [candidateParents, parentSearchQuery]);

  useEffect(() => {
    if (!isParentDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        parentDropdownContainerRef.current &&
        !parentDropdownContainerRef.current.contains(e.target as Node)
      ) {
        setIsParentDropdownOpen(false);
        setParentSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isParentDropdownOpen]);

  useEffect(() => {
    if (isParentDropdownOpen) {
      setTimeout(() => {
        parentSearchInputRef.current?.focus();
      }, 50);
    }
  }, [isParentDropdownOpen]);

  return {
    parentSearchQuery,
    setParentSearchQuery,
    isParentDropdownOpen,
    setIsParentDropdownOpen,
    parentDropdownContainerRef,
    parentSearchInputRef,
    filteredCandidateParents,
  };
}
