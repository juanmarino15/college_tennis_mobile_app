// TournamentDrawScreen (integrated absolute layout + connectors)
// This version PRESERVES your existing styling and renderers.
// - Reuses your `renderMatchCard(match, isDoubles)` without changes
// - Reuses your `styles`, `theme`, `isDark`, `selectedDraw`, `bracketData`, and `getFilteredBracketData()`
// Drop this block into your file, or replace your file with this version and merge any local helpers you have.

import React, {useMemo} from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import Svg, {Path} from 'react-native-svg';

// ---------- TYPES (lightweight; adjust if you have stricter types) ----------
type BracketMatch = {
  match_up_id: string;
  round_position: number; // 1-based
  // ...rest of your fields
};

type BracketRound = {
  roundNumber: number;
  roundName: string;
  matches: BracketMatch[];
};

// ---------- INTEGRATION POINTS ----------
// These are assumed to exist in your file already.
// Remove the "declare" and rely on your actual values/implementations.
declare const styles: any;
declare const theme: any;
declare const isDark: boolean;
declare const selectedDraw: any; // your draw object
declare const bracketData: BracketRound[];
declare function getFilteredBracketData(): BracketRound[];
declare function renderMatchCard(
  match: BracketMatch,
  isDoubles: boolean,
): React.ReactNode;

// ---------- LAYOUT CONSTANTS (non-visual; cards keep your styling) ----------
const MATCH_HEIGHT = 92; // vertical slot for each match card
const MATCH_VSPACE = 20; // vertical gap between matches
const ROUND_HSPACE = 40; // horizontal gap between rounds
const ROUND_WIDTH = 220; // column width (card width + internal padding)
const CARD_HORIZONTAL_PADDING = 12; // inward inset so lines don't touch card borders

// ---------- HELPERS ----------
type YMap = Record<number, Record<number, number>>; // roundIndex -> (round_position -> yTop)

const feederPositions = (parentPos: number) => [
  2 * parentPos - 1,
  2 * parentPos,
];

const computeYMap = (rounds: BracketRound[]): YMap => {
  const yMap: YMap = {};
  if (!rounds.length) return yMap;

  // Round 0 evenly stacked
  yMap[0] = {};
  rounds[0].matches.forEach((m, i) => {
    yMap[0][m.round_position] = i * (MATCH_HEIGHT + MATCH_VSPACE);
  });

  // Subsequent rounds centered on children
  for (let r = 1; r < rounds.length; r++) {
    yMap[r] = {};
    rounds[r].matches.forEach(m => {
      const [l, rt] = feederPositions(m.round_position);
      const y1 = yMap[r - 1][l];
      const y2 = yMap[r - 1][rt];
      const fallback = (m.round_position - 1) * (MATCH_HEIGHT + MATCH_VSPACE);
      yMap[r][m.round_position] =
        y1 != null && y2 != null ? (y1 + y2) / 2 : fallback;
    });
  }
  return yMap;
};

const computeCanvasSize = (rounds: BracketRound[]) => {
  if (!rounds.length) return {width: 0, height: 0};
  const firstCount = rounds[0].matches.length || 1;
  const height = firstCount * MATCH_HEIGHT + (firstCount - 1) * MATCH_VSPACE;
  const width =
    rounds.length * ROUND_WIDTH + (rounds.length - 1) * ROUND_HSPACE;
  return {width, height};
};

// ---------- NEW RENDERERS (layout only; styling remains yours) ----------
const renderRoundAbsolute = (
  round: BracketRound,
  roundIndex: number,
  isDoubles: boolean,
  yMap: YMap,
) => {
  const left = roundIndex * (ROUND_WIDTH + ROUND_HSPACE);

  return (
    <View
      key={`round-${round.roundNumber}`}
      style={[localStyles.absRound, {left, width: ROUND_WIDTH}]}>
      <Text
        style={[
          localStyles.roundTitle,
          {
            color: isDark ? theme.colors.text.dark : theme.colors.text.light,
            marginBottom: 12,
          },
        ]}>
        {round.roundName}
      </Text>

      {round.matches.map(match => {
        const top = yMap[roundIndex]?.[match.round_position] ?? 0;
        return (
          <View
            key={match.match_up_id}
            style={[
              localStyles.absMatch,
              {top, height: MATCH_HEIGHT, width: ROUND_WIDTH},
            ]}>
            {/* Your existing card renderer preserves styling */}
            {renderMatchCard(match, isDoubles)}
          </View>
        );
      })}
    </View>
  );
};

const renderConnectors = (rounds: BracketRound[], yMap: YMap) => {
  if (rounds.length <= 1) return null;

  const {width, height} = computeCanvasSize(rounds);
  const lines: React.ReactNode[] = [];

  for (let r = 1; r < rounds.length; r++) {
    const xPrevRoundRight =
      (r - 1) * (ROUND_WIDTH + ROUND_HSPACE) +
      ROUND_WIDTH -
      CARD_HORIZONTAL_PADDING;
    const xThisRoundLeft =
      r * (ROUND_WIDTH + ROUND_HSPACE) + CARD_HORIZONTAL_PADDING;

    rounds[r].matches.forEach(m => {
      const [leftChildPos, rightChildPos] = feederPositions(m.round_position);
      const yParent = (yMap[r][m.round_position] ?? 0) + MATCH_HEIGHT / 2;

      const yLeft = (yMap[r - 1][leftChildPos] ?? 0) + MATCH_HEIGHT / 2;
      const yRight = (yMap[r - 1][rightChildPos] ?? 0) + MATCH_HEIGHT / 2;

      // Left child -> parent
      lines.push(
        <Path
          key={`l-${r}-${m.round_position}`}
          d={`M ${xPrevRoundRight} ${yLeft} L ${xThisRoundLeft} ${yParent}`}
          stroke={theme.colors.gray[400] || '#9CA3AF'}
          strokeWidth={1}
          fill="none"
        />,
      );

      // Right child -> parent
      lines.push(
        <Path
          key={`r-${r}-${m.round_position}`}
          d={`M ${xPrevRoundRight} ${yRight} L ${xThisRoundLeft} ${yParent}`}
          stroke={theme.colors.gray[400] || '#9CA3AF'}
          strokeWidth={1}
          fill="none"
        />,
      );
    });
  }

  return (
    <Svg
      pointerEvents="none"
      width={width}
      height={height}
      style={localStyles.svgOverlay}>
      {lines}
    </Svg>
  );
};

// ---------- DROP-IN REPLACEMENT FOR YOUR BRACKET VIEW ----------
export const BracketViewAbsolute: React.FC = () => {
  if (!selectedDraw || bracketData.length === 0) {
    return (
      <View style={localStyles.emptyState}>
        <Text style={localStyles.emptyStateText}>
          No bracket data available
        </Text>
      </View>
    );
  }

  const isDoubles = selectedDraw.event_type === 'DOUBLES';
  const filtered = getFilteredBracketData();

  const yMap = useMemo(() => computeYMap(filtered), [filtered]);
  const {width, height} = useMemo(
    () => computeCanvasSize(filtered),
    [filtered],
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        localStyles.bracketStageContainer,
        {width, height},
      ]}>
      {/* Lines behind cards */}
      {renderConnectors(filtered, yMap)}

      {/* Absolute-positioned rounds */}
      {filtered.map((round, idx) =>
        renderRoundAbsolute(round, idx, isDoubles, yMap),
      )}
    </ScrollView>
  );
};

// ---------- LOCAL, MINIMAL STYLES (non-invasive) ----------
// You keep your existing styles for cards/typography.
// These are only for layout & overlay containers.
const localStyles = StyleSheet.create({
  bracketStageContainer: {
    position: 'relative',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  absRound: {
    position: 'absolute',
    top: 0,
  },
  absMatch: {
    position: 'absolute',
    justifyContent: 'center',
  },
  svgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  emptyState: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    color: '#9CA3AF',
  },
  roundTitle: {
    alignItems: 'center',
  },
});

// ---------- HOW TO USE ----------
// 1) Import this component in your screen file:
//    import { BracketViewAbsolute } from "./TournamentDrawScreen.integrated";
// 2) Replace your existing bracket view call (e.g., renderBracketView()) with:
//    <BracketViewAbsolute />
// 3) Remove the `declare` lines and rely on your real variables.
