// src/components/ManageFavoritesModal.tsx
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  SafeAreaView,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {api} from '../api';
import theme from '../theme';
import TeamLogo from './TeamLogo';
import {PreferencesManager} from '../utils/preferencesManager';

interface ManageFavoritesModalProps {
  isVisible: boolean;
  onClose: () => void;
  mode: 'teams' | 'players';
  favoriteTeams: string[];
  favoritePlayers: string[];
  onFavoritesUpdated: (
    type: 'teams' | 'players',
    updatedFavorites: string[],
  ) => void;
  isDark: boolean;
}

interface TeamData {
  id: string;
  name: string;
  gender?: string;
  conference?: string;
}

interface PlayerData {
  person_id: string;
  first_name: string;
  last_name: string;
  team_id?: string;
  team_name?: string;
  avatar_url?: string;
}

const ManageFavoritesModal: React.FC<ManageFavoritesModalProps> = ({
  isVisible,
  onClose,
  mode,
  favoriteTeams,
  favoritePlayers,
  onFavoritesUpdated,
  isDark,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  // Use separate state variables for teams and players to avoid type issues
  const [filteredTeams, setFilteredTeams] = useState<TeamData[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<PlayerData[]>([]);
  const [currentFavorites, setCurrentFavorites] = useState<string[]>([]);
  const [preferredGender, setPreferredGender] = useState<string>('M');

  // Initialize with current favorites
  useEffect(() => {
    if (isVisible) {
      if (mode === 'teams') {
        setCurrentFavorites([...favoriteTeams]);
        fetchAllTeams();
      } else {
        setCurrentFavorites([...favoritePlayers]);
        fetchSavedPlayers();
      }
    } else {
      // Clear search and filters when modal closes
      setSearchQuery('');
      // Reset filtered lists
      setFilteredTeams([]);
      setFilteredPlayers([]);
    }
  }, [isVisible, mode, favoriteTeams, favoritePlayers]);

  // Update filtered items when search changes
  useEffect(() => {
    if (mode === 'teams' && teams.length > 0) {
      const filtered = teams.filter(team => {
        // Filter by gender
        const genderMatch =
          team.gender === preferredGender ||
          team.name.includes(preferredGender === 'M' ? '(M)' : '(W)');

        // Filter by search
        const searchMatch =
          searchQuery === '' ||
          team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (team.conference &&
            team.conference.toLowerCase().includes(searchQuery.toLowerCase()));

        return genderMatch && searchMatch;
      });
      setFilteredTeams(filtered);
    } else if (mode === 'players' && players.length > 0) {
      const filtered = players.filter(player => {
        // Filter by search
        return (
          searchQuery === '' ||
          `${player.first_name} ${player.last_name}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (player.team_name &&
            player.team_name.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      });
      setFilteredPlayers(filtered);
    }
  }, [mode, teams, players, searchQuery, preferredGender]);

  const fetchAllTeams = async () => {
    setLoading(true);
    try {
      const teamsData = await api.teams.getAll();
      // Sort teams alphabetically
      const sortedTeams = [...teamsData].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      setTeams(sortedTeams);
      setFilteredTeams(
        sortedTeams.filter(
          team =>
            team.gender === preferredGender ||
            team.name.includes(preferredGender === 'M' ? '(M)' : '(W)'),
        ),
      );
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedPlayers = async () => {
    setLoading(true);
    try {
      // First get details for existing favorite players
      if (favoritePlayers.length > 0) {
        const playerDetails = await Promise.all(
          favoritePlayers.map(playerId => api.players.getById(playerId)),
        );
        setPlayers(playerDetails);
        setFilteredPlayers(playerDetails);
      } else {
        setPlayers([]);
        setFilteredPlayers([]);
      }
    } catch (error) {
      console.error('Failed to fetch players:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchPlayers = async () => {
    if (searchQuery.trim().length < 2) return;

    setLoading(true);
    try {
      // Search for new players
      const results = await api.players.search(
        searchQuery,
        preferredGender === 'M' ? 'MALE' : 'FEMALE',
        '2025', // Current season
      );

      if (results && results.length > 0) {
        // Transform to our PlayerData format
        const formattedResults: PlayerData[] = results.map(player => ({
          person_id: player.person_id,
          first_name: player.first_name,
          last_name: player.last_name,
          team_id: player.team_id,
          team_name: player.team_name || player.school_name,
          avatar_url: player.avatar_url,
        }));

        // Combine with existing saved players (avoid duplicates)
        const existingIds = players.map(p => p.person_id);
        const newPlayers = formattedResults.filter(
          p => !existingIds.includes(p.person_id),
        );

        const updatedPlayers = [...players, ...newPlayers];
        setPlayers(updatedPlayers);
        setFilteredPlayers(updatedPlayers);
      }
    } catch (error) {
      console.error('Error searching players:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (id: string) => {
    let updatedFavorites: string[];

    if (currentFavorites.includes(id)) {
      // Remove from favorites
      updatedFavorites = currentFavorites.filter(itemId => itemId !== id);
    } else {
      // Add to favorites (limit to 5)
      if (currentFavorites.length >= 5) {
        // Optionally show an alert here
        console.warn('Maximum of 5 favorites reached');
        return;
      }
      updatedFavorites = [...currentFavorites, id];
    }

    setCurrentFavorites(updatedFavorites);

    // Save to storage using the PreferencesManager
    try {
      if (mode === 'teams') {
        await PreferencesManager.toggleFavoriteTeam(id);
      } else {
        await PreferencesManager.toggleFavoritePlayer(id);
      }
      // Notify parent component about the update
      onFavoritesUpdated(mode, updatedFavorites);
    } catch (error) {
      console.error(`Failed to update ${mode}:`, error);
    }
  };

  const handleSearch = () => {
    if (mode === 'players') {
      searchPlayers();
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  // Format team name (remove gender markers)
  const formatTeamName = (name: string | undefined): string => {
    if (!name) return '';
    return name.replace(/\s*\([MW]\)\s*$/, '');
  };

  // Render a team item
  const renderTeamItem = ({item}: {item: TeamData}) => (
    <TouchableOpacity
      style={[
        styles.itemCard,
        currentFavorites.includes(item.id) && {
          backgroundColor: isDark
            ? theme.colors.primary[900]
            : theme.colors.primary[50],
        },
        {
          borderColor: isDark
            ? theme.colors.border.dark
            : theme.colors.border.light,
        },
      ]}
      onPress={() => toggleFavorite(item.id)}>
      <TeamLogo teamId={item.id} size="small" />
      <View style={styles.itemInfo}>
        <Text
          style={[
            styles.itemName,
            {
              color: isDark ? theme.colors.text.dark : theme.colors.text.light,
            },
          ]}>
          {formatTeamName(item.name)}
        </Text>
        {item.conference && (
          <Text
            style={[
              styles.itemDescription,
              {
                color: isDark
                  ? theme.colors.text.dimDark
                  : theme.colors.gray[600],
              },
            ]}>
            {item.conference.replace(/_/g, ' ')}
          </Text>
        )}
      </View>
      <View style={styles.favoriteAction}>
        {currentFavorites.includes(item.id) ? (
          <Icon
            name="check-circle"
            size={24}
            color={theme.colors.primary[500]}
          />
        ) : (
          <View style={styles.addIcon}>
            <Icon
              name="plus"
              size={18}
              color={
                isDark ? theme.colors.text.dimDark : theme.colors.gray[500]
              }
            />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  // Render a player item
  const renderPlayerItem = ({item}: {item: PlayerData}) => (
    <TouchableOpacity
      style={[
        styles.itemCard,
        currentFavorites.includes(item.person_id) && {
          backgroundColor: isDark
            ? theme.colors.primary[900]
            : theme.colors.primary[50],
        },
        {
          borderColor: isDark
            ? theme.colors.border.dark
            : theme.colors.border.light,
        },
      ]}
      onPress={() => toggleFavorite(item.person_id)}>
      <View style={styles.playerAvatar}>
        <Icon
          name="user"
          size={20}
          color={isDark ? theme.colors.gray[600] : theme.colors.gray[400]}
        />
      </View>
      <View style={styles.itemInfo}>
        <Text
          style={[
            styles.itemName,
            {
              color: isDark ? theme.colors.text.dark : theme.colors.text.light,
            },
          ]}>
          {item.first_name} {item.last_name}
        </Text>
        {item.team_name && (
          <Text
            style={[
              styles.itemDescription,
              {
                color: isDark
                  ? theme.colors.text.dimDark
                  : theme.colors.gray[600],
              },
            ]}>
            {formatTeamName(item.team_name)}
          </Text>
        )}
      </View>
      <View style={styles.favoriteAction}>
        {currentFavorites.includes(item.person_id) ? (
          <Icon
            name="check-circle"
            size={24}
            color={theme.colors.primary[500]}
          />
        ) : (
          <View style={styles.addIcon}>
            <Icon
              name="plus"
              size={18}
              color={
                isDark ? theme.colors.text.dimDark : theme.colors.gray[500]
              }
            />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}>
      <SafeAreaView
        style={[
          styles.modalContainer,
          {
            backgroundColor: isDark
              ? theme.colors.background.dark
              : theme.colors.background.light,
          },
        ]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon
              name="arrow-left"
              size={24}
              color={isDark ? theme.colors.text.dark : theme.colors.text.light}
            />
          </TouchableOpacity>
          <Text
            style={[
              styles.title,
              {
                color: isDark
                  ? theme.colors.text.dark
                  : theme.colors.text.light,
              },
            ]}>
            {mode === 'teams' ? 'Manage Teams' : 'Manage Players'}
          </Text>
          <View style={{width: 24}} />
        </View>

        {/* Selection Counter */}
        <View style={styles.counterContainer}>
          <Text
            style={[
              styles.counterText,
              {
                color: isDark
                  ? theme.colors.text.dimDark
                  : theme.colors.gray[600],
              },
            ]}>
            {currentFavorites.length}/5 {mode} selected
          </Text>
        </View>

        {/* Gender selector (only for teams) */}
        {mode === 'teams' && (
          <View style={styles.genderSelector}>
            <TouchableOpacity
              style={[
                styles.genderButton,
                preferredGender === 'M' && {
                  backgroundColor: theme.colors.primary[500],
                },
              ]}
              onPress={() => setPreferredGender('M')}>
              <Text
                style={[
                  styles.genderButtonText,
                  preferredGender === 'M' && {color: 'white'},
                ]}>
                Men
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.genderButton,
                preferredGender === 'F' && {
                  backgroundColor: theme.colors.primary[500],
                },
              ]}
              onPress={() => setPreferredGender('F')}>
              <Text
                style={[
                  styles.genderButtonText,
                  preferredGender === 'F' && {color: 'white'},
                ]}>
                Women
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search bar */}
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: isDark
                ? theme.colors.background.dark
                : theme.colors.gray[100],
              borderColor: isDark
                ? theme.colors.border.dark
                : theme.colors.border.light,
            },
          ]}>
          <Icon
            name="search"
            size={20}
            color={isDark ? theme.colors.text.dimDark : theme.colors.gray[500]}
          />
          <TextInput
            style={[
              styles.searchInput,
              {
                color: isDark
                  ? theme.colors.text.dark
                  : theme.colors.text.light,
              },
            ]}
            placeholder={`Search for ${mode}...`}
            placeholderTextColor={
              isDark ? theme.colors.text.dimDark : theme.colors.gray[400]
            }
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={clearSearch}>
              <Icon
                name="x"
                size={20}
                color={
                  isDark ? theme.colors.text.dimDark : theme.colors.gray[500]
                }
              />
            </TouchableOpacity>
          )}
        </View>

        {/* List of items */}
        {mode === 'teams' ? (
          <FlatList
            data={filteredTeams}
            renderItem={renderTeamItem}
            keyExtractor={item => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon
                  name="users"
                  size={48}
                  color={
                    isDark ? theme.colors.text.dimDark : theme.colors.gray[400]
                  }
                />
                <Text
                  style={[
                    styles.emptyText,
                    {
                      color: isDark
                        ? theme.colors.text.dimDark
                        : theme.colors.gray[600],
                    },
                  ]}>
                  No teams found
                </Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={filteredPlayers}
            renderItem={renderPlayerItem}
            keyExtractor={item => item.person_id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon
                  name="user"
                  size={48}
                  color={
                    isDark ? theme.colors.text.dimDark : theme.colors.gray[400]
                  }
                />
                <Text
                  style={[
                    styles.emptyText,
                    {
                      color: isDark
                        ? theme.colors.text.dimDark
                        : theme.colors.gray[600],
                    },
                  ]}>
                  {searchQuery
                    ? 'No players found, try searching for a different name'
                    : 'Search for players to add to your favorites'}
                </Text>
              </View>
            }
          />
        )}

        {/* Done button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.doneButton,
              {backgroundColor: theme.colors.primary[500]},
            ]}
            onPress={onClose}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    padding: theme.spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing[4],
  },
  closeButton: {
    padding: theme.spacing[2],
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: 'bold',
  },
  counterContainer: {
    marginBottom: theme.spacing[3],
  },
  counterText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
  },
  genderSelector: {
    flexDirection: 'row',
    marginBottom: theme.spacing[3],
  },
  genderButton: {
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.spacing[3],
    marginRight: theme.spacing[2],
    borderWidth: 1,
    borderColor: theme.colors.primary[500],
  },
  genderButtonText: {
    color: theme.colors.primary[500],
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing[3],
    marginBottom: theme.spacing[3],
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: theme.spacing[2],
    fontSize: theme.typography.fontSize.base,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: theme.spacing[4],
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing[3],
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing[2],
  },
  itemInfo: {
    marginLeft: theme.spacing[3],
    flex: 1,
  },
  itemName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
  },
  itemDescription: {
    fontSize: theme.typography.fontSize.sm,
    marginTop: theme.spacing[0.5],
  },
  favoriteAction: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
  },
  addIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing[6],
  },
  emptyText: {
    marginTop: theme.spacing[3],
    fontSize: theme.typography.fontSize.base,
    textAlign: 'center',
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: theme.spacing[4],
  },
  doneButton: {
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[6],
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    width: '80%',
  },
  doneButtonText: {
    color: 'white',
    fontSize: theme.typography.fontSize.base,
    fontWeight: 'bold',
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ManageFavoritesModal;
