import { useState } from 'react';
import { Assumption, Tag, Vote, VoteValue, VoteSummary } from 'narri-ui';
import { VoteBar } from './VoteBar';

interface AssumptionCardProps {
  assumption: Assumption;
  tags: Tag[];
  votes: Vote[];
  voteSummary: VoteSummary;
  onVote: (assumptionId: string, value: VoteValue) => void;
  currentUserId?: string; // Currently unused but kept for future features
}

/**
 * Card displaying a single assumption with vote controls
 */
export function AssumptionCard({
  assumption,
  tags,
  votes,
  voteSummary,
  onVote,
}: AssumptionCardProps) {
  const [showLog, setShowLog] = useState(false);
  const handleVote = (value: VoteValue) => {
    onVote(assumption.id, value);
  };

  return (
    <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
      <div className="card-body">
        <p className="text-lg font-semibold text-base-content leading-relaxed">
          {assumption.sentence}
        </p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <div key={tag.id} className="badge badge-outline">
                {tag.name}
              </div>
            ))}
          </div>
        )}

        {/* Vote Bar */}
        <div className="mt-4">
          <VoteBar summary={voteSummary} />
        </div>

        {/* Vote Buttons */}
        <div className="card-actions justify-center items-center mt-4 flex-wrap gap-3">
          <div className="btn-group">
            <button
              className={`tw:btn btn-sm ${
                voteSummary.userVote === 'green' ? 'tw:btn-success' : 'tw:btn-outline btn-success'
              }`}
              onClick={() => handleVote('green')}
              title="Agree"
            >
              <span className="relative inline-flex items-center justify-center w-7 h-7 text-lg">
                <span>🟢</span>
                {voteSummary.userVote === 'green' && (
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                    ✔︎
                  </span>
                )}
              </span>
              <span className="ml-1">{voteSummary.green}</span>
            </button>
            <button
              className={`tw:btn btn-sm ${
                voteSummary.userVote === 'yellow' ? 'tw:btn-warning' : 'tw:btn-outline btn-warning'
              }`}
              onClick={() => handleVote('yellow')}
              title="Neutral"
            >
              <span className="relative inline-flex items-center justify-center w-7 h-7 text-lg">
                <span>🟡</span>
                {voteSummary.userVote === 'yellow' && (
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                    ✔︎
                  </span>
                )}
              </span>
              <span className="ml-1">{voteSummary.yellow}</span>
            </button>
            <button
              className={`tw:btn btn-sm ${
                voteSummary.userVote === 'red' ? 'tw:btn-error' : 'tw:btn-outline btn-error'
              }`}
              onClick={() => handleVote('red')}
              title="Disagree"
            >
              <span className="relative inline-flex items-center justify-center w-7 h-7 text-lg">
                <span>🔴</span>
                {voteSummary.userVote === 'red' && (
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                    ✔︎
                  </span>
                )}
              </span>
              <span className="ml-1">{voteSummary.red}</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-sm text-base-content opacity-60">
            <span>
              {voteSummary.total} {voteSummary.total === 1 ? 'vote' : 'votes'}
            </span>
            {votes.length > 0 && (
              <button
                type="button"
                className="link link-hover text-xs"
                onClick={() => setShowLog((v) => !v)}
              >
                {showLog ? 'Log verbergen' : 'Log anzeigen'}
              </button>
            )}
          </div>
          {votes.length > 0 && showLog && (
            <div className="mt-3 border-t border-base-200 pt-3 w-full">
              <div className="text-sm font-semibold mb-2 text-base-content/70">Voting Log</div>
              <div className="space-y-1">
                {votes.map((vote) => (
                  <div key={vote.id} className="flex items-center gap-2 text-sm">
                    <span
                      className={
                        vote.value === 'green'
                          ? 'text-success font-semibold'
                          : vote.value === 'yellow'
                            ? 'text-warning font-semibold'
                            : 'text-error font-semibold'
                      }
                    >
                      {vote.value === 'green' ? '🟢' : vote.value === 'yellow' ? '🟡' : '🔴'}
                    </span>
                    <span className="truncate max-w-[120px]" title={vote.voterDid}>
                      {vote.voterDid.slice(0, 8)}...
                    </span>
                    <span className="text-xs text-base-content/60">
                      {new Date(vote.updatedAt ?? vote.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
