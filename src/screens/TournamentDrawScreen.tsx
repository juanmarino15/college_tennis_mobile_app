// src/screens/TournamentDrawScreen.tsx
import React, {
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import {RouteProp} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Feather';
import {
  api,
  TournamentDrawDetails,
  TournamentDraw,
  TournamentMatch,
} from '../api';
import theme from '../theme';
import {ThemeContext} from '../../App';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

// Navigation types
type RootStackParamList = {
  MainTabs: undefined;
  TournamentDetail: {tournamentId: string};
  TournamentDraw: {
    tournamentId: string;
    eventId?: string;
    drawName?: string;
  };
  PlayerDetail: {playerId: string};
};

type TournamentDrawScreenRouteProp = RouteProp<
  RootStackParamList,
  'TournamentDraw'
>;
type TournamentDrawScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'TournamentDraw'
>;

interface TournamentDrawScreenProps {
  route: TournamentDrawScreenRouteProp;
  navigation: TournamentDrawScreenNavigationProp;
}

interface BracketRound {
  roundNumber: number;
  roundName: string;
  matches: TournamentMatch[];
}

// ---- Layout constants (tweak to taste) ----
const COL_WIDTH = 300;
const COL_GAP = 48;
const CARD_H = 150;
const CARD_VGAP = 18;
const LINE_THICK = 2;

// Space for the round header so cards never collide with it
const ROUND_HEADER_H = 28; // visually ~ font 16 + margin
const TOP_PAD = ROUND_HEADER_H + 16;

const TournamentDrawScreen: React.FC<TournamentDrawScreenProps> = ({
  route,
  navigation,
}) => {
  const {tournamentId, eventId, drawName} = route.params;
  const {isDark} = useContext(ThemeContext);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableDraws, setAvailableDraws] = useState<TournamentDraw[]>([]);
  const [selectedDraw, setSelectedDraw] =
    useState<TournamentDrawDetails | null>(null);
  const [selectedDrawId, setSelectedDrawId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('draw');
  const [availableStages, setAvailableStages] = useState<string[]>([]);
  const [selectedStage, setSelectedStage] = useState<string>('MAIN');

  const fetchDrawStages = async (drawId: string) => {
    try {
      const stages = await api.tournaments.getDrawStages(drawId);
      setAvailableStages(stages);
      setSelectedStage(stages.includes('MAIN') ? 'MAIN' : stages[0] || '');
    } catch (err) {
      console.error('Failed to fetch draw stages:', err);
      setAvailableStages([]);
    }
  };

  const fetchAvailableDraws = async () => {
    try {
      const draws = await api.tournaments.getDraws(tournamentId);
      console.log(draws);
      setAvailableDraws(draws);

      // Auto-select draw based on parameters or first available
      let targetDraw: TournamentDraw | null = null;

      if (eventId && drawName) {
        targetDraw =
          draws.find(d => d.event_id === eventId && d.draw_name === drawName) ||
          null;
      } else if (drawName) {
        targetDraw = draws.find(d => d.draw_name === drawName) || null;
      } else if (eventId) {
        targetDraw = draws.find(d => d.event_id === eventId) || null;
      }

      if (!targetDraw && draws.length > 0) targetDraw = draws[0];

      if (targetDraw) {
        setSelectedDrawId(targetDraw.draw_id);
        await fetchDrawDetails(targetDraw.draw_id);
        await fetchDrawStages(targetDraw.draw_id);
      }
    } catch (err) {
      console.error('Failed to fetch available draws:', err);
      setError('Failed to load tournament draws');
    }
  };

  const fetchDrawDetails = async (drawId: string, stage?: string) => {
    try {
      const details = await api.tournaments.getDrawDetails(drawId, stage);
      setSelectedDraw(details);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch draw details:', err);
      setError('Failed to load draw details');
    }
  };

  // Initial data fetch
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchAvailableDraws();
      setLoading(false);
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, eventId, drawName]);

  // Reset active tab when draw changes
  useEffect(() => {
    if (selectedDraw) {
      if (selectedDraw.draw_size > 32) {
        setActiveTab('Section A');
      } else {
        setActiveTab('draw');
      }
    }
  }, [selectedDrawId, selectedDraw]);

  const handleDrawSelection = async (drawId: string, stage?: string) => {
    if (drawId === selectedDrawId && (stage || '') === selectedStage) return;
    setSelectedDrawId(drawId);
    setSelectedStage(stage || '');
    setLoading(true);
    await fetchDrawDetails(drawId, stage);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAvailableDraws();
    setRefreshing(false);
  };

  // ---- Helpers ----
  const isDoubles = selectedDraw?.event_type === 'DOUBLES';

  const rounds: BracketRound[] = useMemo(() => {
    if (!selectedDraw) return [];
    const m = new Map<number, BracketRound>();
    selectedDraw.matches.forEach(mt => {
      if (!m.has(mt.round_number)) {
        m.set(mt.round_number, {
          roundNumber: mt.round_number,
          roundName: mt.round_name,
          matches: [],
        });
      }
      m.get(mt.round_number)!.matches.push(mt);
    });
    return Array.from(m.values())
      .sort((a, b) => a.roundNumber - b.roundNumber)
      .map(r => ({
        ...r,
        matches: r.matches.sort((a, b) => a.round_position - b.round_position),
      }));
  }, [selectedDraw]);

  const veryLarge = (selectedDraw?.draw_size || 0) > 64;

  // ---- Bracket geometry (absolute layout) ----
  type NodeBox = {
    x: number;
    y: number;
    w: number;
    h: number;
    match: TournamentMatch;
    roundIdx: number; // 0-based
    posInRound: number; // 1-based round_position
  };

  const geometry = useMemo(() => {
    if (rounds.length === 0)
      return {boxes: [] as NodeBox[], width: 0, height: 0};

    const boxes: NodeBox[] = [];
    const slot = CARD_H + CARD_VGAP;

    rounds.forEach((round, rIdx) => {
      const colX = rIdx * (COL_WIDTH + COL_GAP);

      // Space matches by powers of two; offset each column downward by TOP_PAD
      const pow = Math.max(1, 2 ** rIdx);
      const yOffset = TOP_PAD + ((pow - 1) * slot) / 2;

      round.matches.forEach(mt => {
        const pos = mt.round_position; // 1-based
        const y = yOffset + (pos - 1) * slot * pow;

        boxes.push({
          x: colX,
          y,
          w: COL_WIDTH,
          h: CARD_H,
          match: mt,
          roundIdx: rIdx,
          posInRound: pos,
        });
      });
    });

    const totalW = rounds.length * COL_WIDTH + (rounds.length - 1) * COL_GAP;
    const totalH =
      (Math.max(...boxes.map(b => b.y + b.h)) || CARD_H) + CARD_VGAP * 2;

    return {
      boxes,
      width: Math.max(totalW, screenWidth),
      height: Math.max(totalH, screenHeight), // instead of screenHeight * 0.6
    };
  }, [rounds]);

  const boxByRoundPos = useMemo(() => {
    const map = new Map<string, NodeBox>();
    geometry.boxes.forEach(b => {
      map.set(`${b.roundIdx}:${b.posInRound}`, b);
    });
    return map;
  }, [geometry.boxes]);

  // ---- UI small renderers ----
  const renderParticipantName = (participant: any) => {
    if (!participant?.participant_name) return 'TBD';

    if (isDoubles && participant.player1_name && participant.player2_name) {
      const getLast = (full: string) => {
        const parts = full.trim().split(' ');
        return parts[parts.length - 1]; // last name
      };
      return `${getLast(participant.player1_name)}/${getLast(
        participant.player2_name,
      )}`;
    }

    return participant.participant_name;
  };

  const MatchCard = ({box}: {box: NodeBox}) => {
    const mt = box.match;
    const side1Won = mt.winning_side === 1;
    const side2Won = mt.winning_side === 2;
    const isCompleted = mt.match_status === 'COMPLETED';

    return (
      <View
        style={[
          styles.matchCard,
          {
            left: box.x,
            top: box.y,
            width: box.w,
            height: box.h,
            backgroundColor: isDark
              ? theme.colors.card.dark
              : theme.colors.card.light,
            borderColor: isDark
              ? theme.colors.border.dark
              : theme.colors.border.light,
          },
        ]}>
        {/* Side 1 */}
        <View
          style={[
            styles.participant,
            {
              borderColor: isDark
                ? theme.colors.border.dark
                : theme.colors.border.light,
            },
            side1Won && styles.winnerParticipant,
          ]}>
          <View style={styles.participantInfo}>
            <Text
              style={[
                styles.participantName,
                {
                  color: isDark
                    ? theme.colors.text.dark
                    : theme.colors.text.light,
                  fontWeight: side1Won ? '700' : '500',
                },
              ]}
              numberOfLines={2}
              ellipsizeMode="tail">
              {renderParticipantName(mt.side1)}
              {!!mt.side1?.seed_number && (
                <Text style={styles.seedText}>
                  {'\u00A0'}({mt.side1.seed_number})
                </Text>
              )}
            </Text>

            {!!mt.side1?.school_name && (
              <Text
                style={[
                  styles.schoolName,
                  {
                    color: isDark
                      ? theme.colors.text.dimDark
                      : theme.colors.gray[600],
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail">
                {mt.side1.school_name}
              </Text>
            )}
          </View>

          <View style={styles.scoreContainer}>
            {isCompleted && !!mt.score_side1 && side1Won && (
              <Text
                style={[
                  styles.score,
                  {
                    color: isDark
                      ? theme.colors.text.dark
                      : theme.colors.text.light,
                    fontWeight: side1Won ? '700' : '500',
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="clip">
                {mt.score_side1}
              </Text>
            )}
          </View>
        </View>

        <View
          style={[
            styles.matchDivider,
            {
              backgroundColor: isDark
                ? theme.colors.border.dark
                : theme.colors.border.light,
            },
          ]}
        />

        {/* Side 2 */}
        <View
          style={[
            styles.participant,
            {
              borderColor: isDark
                ? theme.colors.border.dark
                : theme.colors.border.light,
            },
            side2Won && styles.winnerParticipant,
          ]}>
          <View style={styles.participantInfo}>
            <Text
              style={[
                styles.participantName,
                {
                  color: isDark
                    ? theme.colors.text.dark
                    : theme.colors.text.light,
                  fontWeight: side2Won ? '700' : '500',
                },
              ]}
              numberOfLines={2}
              ellipsizeMode="tail">
              {renderParticipantName(mt.side2)}
              {!!mt.side2?.seed_number && (
                <Text style={styles.seedText}>
                  {'\u00A0'}({mt.side2.seed_number})
                </Text>
              )}
            </Text>

            {!!mt.side2?.school_name && (
              <Text
                style={[
                  styles.schoolName,
                  {
                    color: isDark
                      ? theme.colors.text.dimDark
                      : theme.colors.gray[600],
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail">
                {mt.side2.school_name}
              </Text>
            )}
          </View>

          <View style={styles.scoreContainer}>
            {isCompleted && !!mt.score_side2 && side2Won && (
              <Text
                style={[
                  styles.score,
                  {
                    color: isDark
                      ? theme.colors.text.dark
                      : theme.colors.text.light,
                    fontWeight: side2Won ? '700' : '500',
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="clip">
                {mt.score_side2}
              </Text>
            )}
          </View>
        </View>

        {!isCompleted && (
          <View style={styles.statusIndicator}>
            <Text
              style={[
                styles.statusText,
                {
                  color: isDark
                    ? theme.colors.text.dimDark
                    : theme.colors.gray[500],
                },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail">
              {mt.match_status}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Connector lines between rounds (L └┌ shapes)
  const Connectors = () => {
    if (geometry.boxes.length === 0) return null;

    const items: React.ReactElement[] = [];

    geometry.boxes.forEach(box => {
      if (box.roundIdx >= rounds.length - 1) return;

      const isOdd = box.posInRound % 2 === 1;
      const partnerPos = isOdd ? box.posInRound + 1 : box.posInRound - 1;
      const keyBase = `${box.match.match_up_id}-${box.roundIdx}-${box.posInRound}`;

      const x1 = box.x + box.w;
      const yCenter = box.y + box.h / 2;
      const midX = box.x + box.w + COL_GAP / 2;

      const partner = boxByRoundPos.get(`${box.roundIdx}:${partnerPos}`);
      if (!partner) {
        items.push(
          <View
            key={`stub-${keyBase}`}
            style={{
              position: 'absolute',
              left: x1,
              top: yCenter - LINE_THICK / 2,
              width: COL_GAP / 2,
              height: LINE_THICK,
              backgroundColor: isDark
                ? theme.colors.border.dark
                : theme.colors.border.light,
            }}
          />,
        );
        return;
      }

      const partnerCenter = partner.y + partner.h / 2;
      const topY = Math.min(yCenter, partnerCenter);
      const height = Math.abs(yCenter - partnerCenter);

      // 1) short horizontal from card to mid
      items.push(
        <View
          key={`h1-${keyBase}`}
          style={{
            position: 'absolute',
            left: x1,
            top: yCenter - LINE_THICK / 2,
            width: COL_GAP / 2,
            height: LINE_THICK,
            backgroundColor: isDark
              ? theme.colors.border.dark
              : theme.colors.border.light,
          }}
        />,
      );

      // 2) vertical joining the pair at midX
      items.push(
        <View
          key={`v-${keyBase}`}
          style={{
            position: 'absolute',
            left: midX - LINE_THICK / 2,
            top: topY,
            width: LINE_THICK,
            height: Math.max(1, height),
            backgroundColor: isDark
              ? theme.colors.border.dark
              : theme.colors.border.light,
          }}
        />,
      );

      // Only upper draws the forward horizontal to next column
      if (isOdd) {
        const nextX = box.x + box.w + COL_GAP;
        const midY = (yCenter + partnerCenter) / 2;

        items.push(
          <View
            key={`h2-${keyBase}`}
            style={{
              position: 'absolute',
              left: midX,
              top: midY - LINE_THICK / 2,
              width: Math.max(1, nextX - midX),
              height: LINE_THICK,
              backgroundColor: isDark
                ? theme.colors.border.dark
                : theme.colors.border.light,
            }}
          />,
        );
      }
    });

    // Absolutely position the connectors behind the cards
    return (
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
        }}>
        {items}
      </View>
    );
  };

  // ---------- ROUND ROBIN ----------
  type RRRow = {
    id: string;
    name: string;
    wins: number;
    losses: number;
    // (optional) we can add MP, GF, GA later if you parse set strings
  };

  const safeIdOf = (p: any) =>
    p?.participant_id || p?.participantId || p?.id || p?.participant?.id || '';

  const nameOfSide = (p: any): string => renderParticipantName(p);

  const computeRR = useCallback(() => {
    const rows = new Map<string, RRRow>();
    if (!selectedDraw?.matches)
      return {standings: [] as RRRow[], fixtures: [] as TournamentMatch[]};

    const fixtures = selectedDraw.matches;

    // collect participants from sides
    fixtures.forEach(m => {
      const aId = safeIdOf(m.side1);
      const bId = safeIdOf(m.side2);
      if (aId && !rows.has(aId)) {
        rows.set(aId, {id: aId, name: nameOfSide(m.side1), wins: 0, losses: 0});
      }
      if (bId && !rows.has(bId)) {
        rows.set(bId, {id: bId, name: nameOfSide(m.side2), wins: 0, losses: 0});
      }
    });

    // accumulate wins/losses (only for completed/decided matches)
    fixtures.forEach(m => {
      const aId = safeIdOf(m.side1);
      const bId = safeIdOf(m.side2);
      if (!aId || !bId) return;

      if (m.winning_side === 1) {
        rows.get(aId)!.wins += 1;
        rows.get(bId)!.losses += 1;
      } else if (m.winning_side === 2) {
        rows.get(bId)!.wins += 1;
        rows.get(aId)!.losses += 1;
      }
    });

    const standings = Array.from(rows.values()).sort(
      (x, y) =>
        y.wins - x.wins || x.losses - y.losses || x.name.localeCompare(y.name),
    );

    return {standings, fixtures};
  }, [selectedDraw]);

  const currentDrawMeta = useMemo(
    () => availableDraws.find(d => d.draw_id === selectedDrawId),
    [availableDraws, selectedDrawId],
  );

  const isRoundRobin = useMemo(() => {
    const t =
      (currentDrawMeta as any)?.draw_type ||
      (selectedDraw as any)?.draw_type ||
      '';
    return String(t).toUpperCase() === 'ROUND_ROBIN';
  }, [currentDrawMeta, selectedDraw]);

  const renderRoundRobin = () => {
    if (!selectedDraw) {
      return (
        <View style={styles.emptyState}>
          <Icon
            name="grid"
            size={48}
            color={isDark ? theme.colors.text.dimDark : theme.colors.gray[400]}
          />
          <Text
            style={[
              styles.emptyStateText,
              {
                color: isDark
                  ? theme.colors.text.dimDark
                  : theme.colors.gray[600],
              },
            ]}>
            No round-robin data available
          </Text>
        </View>
      );
    }

    const {standings, fixtures} = computeRR();

    return (
      <View style={{paddingHorizontal: 16, paddingTop: 8}}>
        {/* Standings */}
        <View
          style={[
            styles.rrCard,
            {
              backgroundColor: isDark
                ? theme.colors.card.dark
                : theme.colors.card.light,
              borderColor: isDark
                ? theme.colors.border.dark
                : theme.colors.border.light,
            },
          ]}>
          <Text
            style={[
              styles.rrTitle,
              {
                color: isDark
                  ? theme.colors.text.dark
                  : theme.colors.text.light,
              },
            ]}>
            Standings
          </Text>

          <View
            style={[
              styles.table,
              {
                borderColor: isDark
                  ? theme.colors.border.dark
                  : theme.colors.border.light,
              },
            ]}>
            <View
              style={[
                styles.tr,
                styles.thRow,
                {
                  backgroundColor: isDark
                    ? theme.colors.gray[800]
                    : theme.colors.gray[100],
                },
              ]}>
              <Text
                style={[
                  styles.thColName,
                  {
                    color: isDark
                      ? theme.colors.text.dark
                      : theme.colors.text.light,
                  },
                ]}>
                Team
              </Text>
              <Text
                style={[
                  styles.th,
                  {
                    color: isDark
                      ? theme.colors.text.dark
                      : theme.colors.text.light,
                  },
                ]}>
                W
              </Text>
              <Text
                style={[
                  styles.th,
                  {
                    color: isDark
                      ? theme.colors.text.dark
                      : theme.colors.text.light,
                  },
                ]}>
                L
              </Text>
            </View>

            {standings.map((row, idx) => (
              <View
                key={row.id || `rr-row-${idx}`}
                style={[
                  styles.tr,
                  idx % 2 ? styles.trAlt : null,
                  {
                    backgroundColor:
                      idx % 2
                        ? isDark
                          ? 'rgba(255,255,255,0.03)'
                          : 'rgba(0,0,0,0.02)'
                        : 'transparent',
                  },
                ]}>
                <Text
                  style={[
                    styles.tdName,
                    {
                      color: isDark
                        ? theme.colors.text.dark
                        : theme.colors.text.light,
                    },
                  ]}
                  numberOfLines={1}>
                  {row.name}
                </Text>
                <Text
                  style={[
                    styles.td,
                    {
                      color: isDark
                        ? theme.colors.text.dark
                        : theme.colors.text.light,
                      textAlign: 'center',
                    },
                  ]}>
                  {row.wins}
                </Text>
                <Text
                  style={[
                    styles.td,
                    {
                      color: isDark
                        ? theme.colors.text.dark
                        : theme.colors.text.light,
                      textAlign: 'center',
                    },
                  ]}>
                  {row.losses}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Fixtures */}
        <View
          style={[
            styles.rrCard,
            {
              backgroundColor: isDark
                ? theme.colors.card.dark
                : theme.colors.card.light,
              borderColor: isDark
                ? theme.colors.border.dark
                : theme.colors.border.light,
            },
          ]}>
          <Text
            style={[
              styles.rrTitle,
              {
                color: isDark
                  ? theme.colors.text.dark
                  : theme.colors.text.light,
              },
            ]}>
            Matches
          </Text>

          <View style={{gap: 8}}>
            {fixtures.map(m => {
              const done =
                m.match_status === 'COMPLETED' || m.winning_side != null;
              return (
                <View
                  key={m.match_up_id}
                  style={[
                    styles.fixtureRow,
                    {
                      borderColor: isDark
                        ? theme.colors.border.dark
                        : theme.colors.border.light,
                      backgroundColor: isDark
                        ? theme.colors.background.dark
                        : theme.colors.background.light,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.fixtureText,
                      {
                        color: isDark
                          ? theme.colors.text.dark
                          : theme.colors.text.light,
                      },
                    ]}
                    numberOfLines={1}>
                    {nameOfSide(m.side1)} <Text style={{opacity: 0.6}}>vs</Text>{' '}
                    {nameOfSide(m.side2)}
                  </Text>
                  <Text
                    style={[
                      styles.fixtureScore,
                      {
                        color: isDark
                          ? theme.colors.text.dark
                          : theme.colors.text.light,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.fixtureScore,
                        {
                          color: isDark
                            ? theme.colors.text.dark
                            : theme.colors.text.light,
                        },
                      ]}>
                      {done
                        ? m.winning_side === 1
                          ? m.score_side1 ?? '—'
                          : m.winning_side === 2
                          ? m.score_side2 ?? '—'
                          : '—'
                        : '—'}
                    </Text>
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  // ---- Top sections/tabs/stats (unchanged) ----
  const DrawSelector = () => {
    if (availableDraws.length <= 1) return null;

    return (
      <View style={styles.drawSelector}>
        <Text
          style={[
            styles.selectorLabel,
            {color: isDark ? theme.colors.text.dark : theme.colors.text.light},
          ]}>
          Select Draw:
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.drawOptions}>
          {availableDraws.map(draw => {
            const isActive =
              selectedDrawId === draw.draw_id &&
              selectedStage === (draw.stage || '');
            return (
              <TouchableOpacity
                key={`${draw.draw_id}-${draw.stage || 'main'}`}
                style={[
                  styles.drawOption,
                  {
                    backgroundColor: isActive
                      ? theme.colors.primary[600]
                      : isDark
                      ? theme.colors.gray[800]
                      : theme.colors.gray[100],
                  },
                ]}
                onPress={() => handleDrawSelection(draw.draw_id, draw.stage)}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.drawOptionText,
                    {
                      color: isActive
                        ? 'white'
                        : isDark
                        ? theme.colors.text.dark
                        : theme.colors.text.light,
                    },
                  ]}>
                  {draw.draw_name}
                </Text>
                {!!draw.draw_size && (
                  <Text
                    style={[
                      styles.drawSizeText,
                      {
                        color: isActive
                          ? 'rgba(255,255,255,0.85)'
                          : isDark
                          ? theme.colors.text.dimDark
                          : theme.colors.gray[600],
                      },
                    ]}>
                    ({draw.draw_size})
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const DrawStats = () => {
    if (!selectedDraw) return null;
    return (
      <View style={styles.statsContainer}>
        <Stat
          label="Participants"
          value={`${selectedDraw.participants_count}`}
        />
        <Stat label="Completed" value={`${selectedDraw.completed_matches}`} />
        <Stat label="Total Matches" value={`${selectedDraw.total_matches}`} />
        <Stat
          label="Status"
          value={
            selectedDraw.draw_completed
              ? 'Completed'
              : selectedDraw.draw_active
              ? 'Active'
              : 'Scheduled'
          }
          color={
            selectedDraw.draw_completed
              ? theme.colors?.success ?? '#16a34a' // fallback green if your theme lacks .success
              : selectedDraw.draw_active
              ? theme.colors?.warning ?? '#f59e0b' // fallback amber if your theme lacks .warning
              : theme.colors.gray[500]
          }
        />
      </View>
    );
  };

  const Stat = ({
    label,
    value,
    color,
  }: {
    label: string;
    value: string;
    color?: string;
  }) => (
    <View style={styles.statItem}>
      <Text
        style={[
          styles.statValue,
          {
            color:
              color ||
              (isDark ? theme.colors.text.dark : theme.colors.text.light),
          },
        ]}>
        {value}
      </Text>
      <Text
        style={[
          styles.statLabel,
          {color: isDark ? theme.colors.text.dimDark : theme.colors.gray[600]},
        ]}>
        {label}
      </Text>
    </View>
  );

  // ---- Main bracket view ----
  const renderBracket = () => {
    if (!selectedDraw || rounds.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Icon
            name="grid"
            size={48}
            color={isDark ? theme.colors.text.dimDark : theme.colors.gray[400]}
          />
          <Text
            style={[
              styles.emptyStateText,
              {
                color: isDark
                  ? theme.colors.text.dimDark
                  : theme.colors.gray[600],
              },
            ]}>
            No bracket data available
          </Text>
        </View>
      );
    }

    if (veryLarge) {
      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 16}}>
          {rounds.map(r => (
            <View
              key={`col-${r.roundNumber}`}
              style={{marginRight: 20, width: COL_WIDTH}}>
              <Text
                style={[
                  styles.roundTitle,
                  {
                    color: isDark
                      ? theme.colors.text.dark
                      : theme.colors.text.light,
                  },
                ]}>
                {r.roundName}
              </Text>
              {r.matches.map(mt => {
                return (
                  <View
                    key={mt.match_up_id}
                    style={{
                      marginBottom: CARD_VGAP,
                      borderWidth: 1,
                      borderColor: isDark
                        ? theme.colors.border.dark
                        : theme.colors.border.light,
                      borderRadius: 8,
                      padding: 12,
                      backgroundColor: isDark
                        ? theme.colors.card.dark
                        : theme.colors.card.light,
                      overflow: 'hidden',
                    }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontWeight: '600',
                        color: isDark
                          ? theme.colors.text.dark
                          : theme.colors.text.light,
                        marginBottom: 6,
                      }}>
                      {r.roundName}
                    </Text>
                    <Text
                      numberOfLines={2}
                      ellipsizeMode="tail"
                      style={{
                        color: isDark
                          ? theme.colors.text.dark
                          : theme.colors.text.light,
                      }}>
                      {renderParticipantName(mt.side1)}
                    </Text>
                    <Text
                      numberOfLines={2}
                      ellipsizeMode="tail"
                      style={{
                        color: isDark
                          ? theme.colors.text.dark
                          : theme.colors.text.light,
                      }}>
                      {renderParticipantName(mt.side2)}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      );
    }

    // Connected absolute-layout bracket
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{padding: 16}}>
        {/* Width of the whole bracket */}
        <View style={{width: geometry.width}}>
          {/* SINGLE vertical surface measured by the OUTER page ScrollView */}
          <View
            style={{
              width: geometry.width,
              height: geometry.height, // <-- makes the outer scroller know true height
              position: 'relative',
            }}>
            {/* Round headers */}
            {rounds.map((r, idx) => (
              <Text
                key={`hdr-${r.roundNumber}`}
                style={[
                  styles.roundTitle,
                  {
                    position: 'absolute',
                    left: idx * (COL_WIDTH + COL_GAP),
                    top: 0,
                    width: COL_WIDTH,
                    color: isDark
                      ? theme.colors.text.dark
                      : theme.colors.text.light,
                  },
                ]}>
                {r.roundName}
              </Text>
            ))}

            {/* Connectors behind */}
            <Connectors />

            {/* Match cards on top */}
            {geometry.boxes.map(b => (
              <MatchCard key={`box-${b.match.match_up_id}`} box={b} />
            ))}
          </View>
        </View>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          {
            backgroundColor: isDark
              ? theme.colors.background.dark
              : theme.colors.background.light,
          },
        ]}>
        <ActivityIndicator size="large" color={theme.colors.primary[600]} />
        <Text
          style={[
            styles.loadingText,
            {
              color: isDark
                ? theme.colors.text.dimDark
                : theme.colors.gray[600],
            },
          ]}>
          Loading tournament draw...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          {
            backgroundColor: isDark
              ? theme.colors.background.dark
              : theme.colors.background.light,
          },
        ]}>
        <Icon name="alert-circle" size={48} color={theme.colors.error} />
        <Text
          style={[
            styles.errorText,
            {color: isDark ? theme.colors.text.dark : theme.colors.text.light},
          ]}>
          {error}
        </Text>
        <TouchableOpacity
          style={[
            styles.retryButton,
            {backgroundColor: theme.colors.primary[600]},
          ]}
          onPress={onRefresh}
          activeOpacity={0.7}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? theme.colors.background.dark
            : theme.colors.background.light,
        },
      ]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark
              ? theme.colors.card.dark
              : theme.colors.card.light,
            borderBottomColor: isDark
              ? theme.colors.border.dark
              : theme.colors.border.light,
          },
        ]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Icon
            name="arrow-left"
            size={24}
            color={isDark ? theme.colors.text.dark : theme.colors.text.light}
          />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text
            style={[
              styles.headerTitle,
              {
                color: isDark
                  ? theme.colors.text.dark
                  : theme.colors.text.light,
              },
            ]}>
            Tournament Draw
          </Text>

          {selectedDraw && (
            <Text
              style={[
                styles.headerSubtitle,
                {
                  color: isDark
                    ? theme.colors.text.dimDark
                    : theme.colors.gray[600],
                },
              ]}>
              {selectedDraw.draw_name}
            </Text>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        nestedScrollEnabled
        contentContainerStyle={{paddingBottom: 24}}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary[600]]}
            tintColor={theme.colors.primary[600]}
          />
        }>
        <DrawSelector />
        <DrawStats />
        {/* Switch between bracket and round-robin */}
        {isRoundRobin ? renderRoundRobin() : renderBracket()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  centered: {justifyContent: 'center', alignItems: 'center'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 5,
    borderBottomWidth: 1,
  },
  backButton: {padding: 8, marginRight: 8},
  headerContent: {flex: 1},
  headerTitle: {fontSize: 18, fontWeight: 'bold'},
  headerSubtitle: {fontSize: 14, marginTop: 2},
  content: {flex: 1},

  // Selector
  drawSelector: {padding: 16},
  selectorLabel: {fontSize: 16, fontWeight: '600', marginBottom: 12},
  drawOptions: {paddingRight: 16},
  drawOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawOptionText: {fontSize: 14, fontWeight: '500'},
  drawSizeText: {fontSize: 12, marginLeft: 4},

  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    justifyContent: 'space-around',
  },
  statItem: {alignItems: 'center'},
  statValue: {fontSize: 18, fontWeight: 'bold'},
  statLabel: {fontSize: 12, marginTop: 2},

  // Round header (used in both modes)
  roundTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },

  // Absolute bracket cards
  matchCard: {
    position: 'absolute',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    overflow: 'hidden', // <— clip long text & lines
    zIndex: 2, // <— above connectors
    elevation: 2, // Android
  },
  participant: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1, // add border
    paddingHorizontal: 6, // give breathing room from border
    marginVertical: 2, // small spacing between side1 & side2
  },

  winnerParticipant: {backgroundColor: 'rgba(34, 197, 94, 0.10)'},
  participantInfo: {flex: 1, paddingRight: 8},
  participantName: {fontSize: 14, lineHeight: 18},
  schoolName: {fontSize: 12, marginTop: 2, lineHeight: 16},
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  seedText: {
    marginLeft: 5,
    fontSize: 12,
    color: theme.colors.primary[600],
    fontWeight: '500',
  },

  scoreContainer: {minWidth: 52, alignItems: 'flex-end'},
  score: {fontSize: 14, fontWeight: '500'},
  matchDivider: {height: 1, marginVertical: 6},
  statusIndicator: {marginTop: 4, alignItems: 'center'},
  statusText: {fontSize: 12, fontStyle: 'italic'},

  emptyState: {alignItems: 'center', paddingVertical: 40},
  emptyStateText: {fontSize: 16, marginTop: 12},
  loadingText: {fontSize: 16, marginTop: 12},
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 32,
    marginTop: 12,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {color: 'white', fontSize: 16, fontWeight: '600'},

  // --- round robin styles ---
  rrCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  rrTitle: {fontSize: 16, fontWeight: '700', marginBottom: 8},

  // Simple table
  table: {borderWidth: 1, borderRadius: 8, overflow: 'hidden'},
  tr: {flexDirection: 'row', alignItems: 'center'},
  trAlt: {},
  thRow: {paddingVertical: 8, paddingHorizontal: 8},
  thColName: {flex: 1, fontSize: 12, fontWeight: '700'},
  th: {width: 48, fontSize: 12, fontWeight: '700', textAlign: 'center'},
  tdName: {flex: 1, fontSize: 12, paddingVertical: 10, paddingHorizontal: 8},
  td: {width: 48, fontSize: 12, paddingVertical: 10},

  // Fixtures
  fixtureRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fixtureText: {fontSize: 13, flex: 1, marginRight: 12},
  fixtureScore: {fontSize: 13},
});

export default TournamentDrawScreen;
