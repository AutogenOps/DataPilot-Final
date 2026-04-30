import { motion } from 'framer-motion';
import { JobStatus, ClusterState, PipelineStatus } from '../types';

interface StatusDotProps {
  status: JobStatus | ClusterState | PipelineStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
}

export default function StatusDot({ status, size = 'md', showLabel = false, animated = true }: StatusDotProps) {
  const getStatusColor = () => {
    const normalizedStatus = status.toUpperCase();
    if (normalizedStatus === 'RUNNING' || normalizedStatus === 'SUCCEEDED') {
      return 'bg-status-success';
    }
    if (normalizedStatus === 'FAILED' || normalizedStatus === 'ERROR') {
      return 'bg-status-error';
    }
    if (normalizedStatus === 'PENDING' || normalizedStatus === 'RESTARTING') {
      return 'bg-status-warning';
    }
    return 'bg-text-muted';
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'w-1.5 h-1.5';
      case 'lg':
        return 'w-3 h-3';
      default:
        return 'w-2 h-2';
    }
  };

  const getGlowColor = () => {
    const normalizedStatus = status.toUpperCase();
    if (normalizedStatus === 'RUNNING' || normalizedStatus === 'SUCCEEDED') {
      return ['0 0 0 0 rgba(126,231,135,0.55)', '0 0 0 8px rgba(126,231,135,0)'];
    }
    if (normalizedStatus === 'FAILED' || normalizedStatus === 'ERROR') {
      return ['0 0 0 0 rgba(255,107,107,0.55)', '0 0 0 8px rgba(255,107,107,0)'];
    }
    if (normalizedStatus === 'PENDING' || normalizedStatus === 'RESTARTING') {
      return ['0 0 0 0 rgba(242,184,75,0.55)', '0 0 0 8px rgba(242,184,75,0)'];
    }
    return ['0 0 0 0 rgba(139,146,160,0.7)', '0 0 0 8px rgba(139,146,160,0)'];
  };

  const dot = animated ? (
    <motion.div
      className={`${getSizeClass()} rounded-full ${getStatusColor()}`}
      animate={
        status.toUpperCase() === 'RUNNING'
          ? { boxShadow: getGlowColor() }
          : {}
      }
      transition={{ duration: 2, repeat: Infinity }}
    />
  ) : (
    <div className={`${getSizeClass()} rounded-full ${getStatusColor()}`} />
  );

  if (showLabel) {
    return (
      <div className="flex items-center gap-2">
        {dot}
        <span className="text-sm font-mono text-text-secondary">{status}</span>
      </div>
    );
  }

  return dot;
}
