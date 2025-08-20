// DateRangePicker.tsx - Custom date range picker component with date validation
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Feather';
import {format, isValid} from 'date-fns';
import theme from '../theme';

interface DateRangePickerProps {
  startDate: Date;
  endDate?: Date;
  onStartDateChange: (date: Date) => void;
  onEndDateChange?: (date: Date) => void;
  isDark: boolean;
  mode?: 'single' | 'range';
}

// Helper function to ensure we have a valid date
const ensureValidDate = (date: any): Date => {
  if (date instanceof Date && !isNaN(date.getTime())) {
    return date;
  }
  // Try to parse if it's a string
  if (typeof date === 'string') {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  // Return current date as fallback
  return new Date();
};

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  isDark,
  mode = 'range',
}) => {
  // Ensure we have valid dates from props
  const validStartDate = ensureValidDate(startDate);
  const validEndDate = ensureValidDate(endDate || startDate);

  const [showModal, setShowModal] = useState(false);
  const [activeSelector, setActiveSelector] = useState<'start' | 'end'>(
    'start',
  );
  const [tempStartDate, setTempStartDate] = useState<Date>(validStartDate);
  const [tempEndDate, setTempEndDate] = useState<Date>(validEndDate);

  // Keep temp dates in sync with props when modal is closed
  useEffect(() => {
    if (!showModal) {
      setTempStartDate(ensureValidDate(startDate));
      setTempEndDate(ensureValidDate(endDate || startDate));
    }
  }, [startDate, endDate, showModal]);

  const handleApply = () => {
    // Ensure we're passing valid dates
    const finalStartDate = ensureValidDate(tempStartDate);
    const finalEndDate = ensureValidDate(tempEndDate);

    onStartDateChange(finalStartDate);
    if (mode === 'range' && onEndDateChange) {
      onEndDateChange(finalEndDate);
    }
    setShowModal(false);
  };

  const handleCancel = () => {
    setTempStartDate(ensureValidDate(startDate));
    setTempEndDate(ensureValidDate(endDate || startDate));
    setShowModal(false);
  };

  const formatDateDisplay = () => {
    try {
      if (mode === 'single') {
        return format(validStartDate, 'EEE, MMM d, yyyy'); // CHANGE THIS LINE
      } else {
        return `${format(validStartDate, 'MMM d')} - ${format(
          validEndDate,
          'MMM d, yyyy',
        )}`;
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Select Date';
    }
  };

  // Handle date change for single mode
  const handleSingleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowModal(false);
    }

    if (date && !isNaN(date.getTime())) {
      const validDate = ensureValidDate(date);
      setTempStartDate(validDate);

      // For Android, apply immediately in single mode
      if (Platform.OS === 'android' && mode === 'single') {
        onStartDateChange(validDate);
      }
    }
  };

  // Handle date change for range mode
  const handleRangeDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (date && !isNaN(date.getTime())) {
      const validDate = ensureValidDate(date);

      if (activeSelector === 'start') {
        setTempStartDate(validDate);
        // Auto-adjust end date if it's before start date
        if (validDate > tempEndDate) {
          setTempEndDate(validDate);
        }
      } else {
        setTempEndDate(validDate);
      }
    }
  };

  return (
    <>
      {/* Date Selector Button */}
      <TouchableOpacity
        style={[
          styles.dateSelector,
          {
            borderColor: isDark
              ? theme.colors.border.dark
              : theme.colors.border.light,
          },
        ]}
        onPress={() => setShowModal(true)}>
        <Icon name="calendar" size={16} color={theme.colors.primary[500]} />
        <Text
          style={[
            styles.dateText,
            {
              color: isDark ? theme.colors.text.dark : theme.colors.text.light,
            },
          ]}>
          {formatDateDisplay()}
        </Text>
        <Icon
          name="chevron-down"
          size={16}
          color={isDark ? theme.colors.text.dimDark : theme.colors.gray[500]}
        />
      </TouchableOpacity>

      {/* Date Picker Modal */}
      {showModal && (
        <Modal
          visible={showModal}
          transparent={true}
          animationType="slide"
          onRequestClose={handleCancel}>
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: isDark
                    ? theme.colors.card.dark
                    : theme.colors.card.light,
                },
              ]}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color: isDark
                        ? theme.colors.text.dark
                        : theme.colors.text.light,
                    },
                  ]}>
                  {mode === 'single' ? 'Select Date' : 'Select Date Range'}
                </Text>
                <TouchableOpacity onPress={handleCancel}>
                  <Icon
                    name="x"
                    size={24}
                    color={
                      isDark
                        ? theme.colors.text.dimDark
                        : theme.colors.gray[500]
                    }
                  />
                </TouchableOpacity>
              </View>

              {/* Date Selection Tabs (for range mode) */}
              {mode === 'range' && (
                <View style={styles.tabContainer}>
                  <TouchableOpacity
                    style={[
                      styles.tab,
                      activeSelector === 'start' && {
                        backgroundColor: theme.colors.primary[500],
                      },
                      {
                        borderColor: isDark
                          ? theme.colors.border.dark
                          : theme.colors.border.light,
                      },
                    ]}
                    onPress={() => setActiveSelector('start')}>
                    <Text
                      style={[
                        styles.tabText,
                        {
                          color:
                            activeSelector === 'start'
                              ? theme.colors.white
                              : isDark
                              ? theme.colors.text.dark
                              : theme.colors.text.light,
                        },
                      ]}>
                      Start Date
                    </Text>
                    <Text
                      style={[
                        styles.tabDate,
                        {
                          color:
                            activeSelector === 'start'
                              ? theme.colors.white
                              : isDark
                              ? theme.colors.text.dimDark
                              : theme.colors.gray[600],
                        },
                      ]}>
                      {format(tempStartDate, 'MMM d, yyyy')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.tab,
                      activeSelector === 'end' && {
                        backgroundColor: theme.colors.primary[500],
                      },
                      {
                        borderColor: isDark
                          ? theme.colors.border.dark
                          : theme.colors.border.light,
                      },
                    ]}
                    onPress={() => setActiveSelector('end')}>
                    <Text
                      style={[
                        styles.tabText,
                        {
                          color:
                            activeSelector === 'end'
                              ? theme.colors.white
                              : isDark
                              ? theme.colors.text.dark
                              : theme.colors.text.light,
                        },
                      ]}>
                      End Date
                    </Text>
                    <Text
                      style={[
                        styles.tabDate,
                        {
                          color:
                            activeSelector === 'end'
                              ? theme.colors.white
                              : isDark
                              ? theme.colors.text.dimDark
                              : theme.colors.gray[600],
                        },
                      ]}>
                      {format(tempEndDate, 'MMM d, yyyy')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Date Pickers */}
              <View style={styles.pickerContainer}>
                {mode === 'single' ? (
                  <DateTimePicker
                    value={tempStartDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                    onChange={handleSingleDateChange}
                    textColor={isDark ? '#FFFFFF' : '#000000'}
                    themeVariant={isDark ? 'dark' : 'light'}
                  />
                ) : (
                  <>
                    {activeSelector === 'start' ? (
                      <DateTimePicker
                        value={tempStartDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                        onChange={handleRangeDateChange}
                        textColor={isDark ? '#FFFFFF' : '#000000'}
                        themeVariant={isDark ? 'dark' : 'light'}
                      />
                    ) : (
                      <DateTimePicker
                        value={tempEndDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                        onChange={handleRangeDateChange}
                        minimumDate={tempStartDate}
                        textColor={isDark ? '#FFFFFF' : '#000000'}
                        themeVariant={isDark ? 'dark' : 'light'}
                      />
                    )}
                  </>
                )}
              </View>

              {/* Quick Date Options */}
              <View style={styles.quickOptionsContainer}>
                <Text
                  style={[
                    styles.quickOptionsTitle,
                    {
                      color: isDark
                        ? theme.colors.text.dimDark
                        : theme.colors.gray[600],
                    },
                  ]}>
                  Quick Select:
                </Text>
                <View style={styles.quickOptions}>
                  <TouchableOpacity
                    style={[
                      styles.quickOption,

                      {
                        borderColor: isDark
                          ? theme.colors.border.dark
                          : theme.colors.border.light,
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => {
                      const today = new Date();
                      setTempStartDate(today);
                      if (mode === 'range') {
                        setTempEndDate(today);
                      }
                    }}>
                    <Text
                      style={[
                        styles.quickOptionText,
                        {
                          color: isDark
                            ? theme.colors.text.dark
                            : theme.colors.gray[700],
                        },
                      ]}>
                      Today
                    </Text>
                  </TouchableOpacity>

                  {mode === 'range' && (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.quickOption,
                          {
                            borderColor: isDark
                              ? theme.colors.border.dark
                              : theme.colors.border.light,
                            borderWidth: 1,
                          },
                        ]}
                        onPress={() => {
                          const today = new Date();
                          const weekFromNow = new Date();
                          weekFromNow.setDate(today.getDate() + 7);
                          setTempStartDate(today);
                          setTempEndDate(weekFromNow);
                        }}>
                        <Text
                          style={[
                            styles.quickOptionText,
                            {
                              color: isDark
                                ? theme.colors.text.dark
                                : theme.colors.gray[700],
                            },
                          ]}>
                          Next 7 Days
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.quickOption,
                          {
                            borderColor: isDark
                              ? theme.colors.border.dark
                              : theme.colors.border.light,
                            borderWidth: 1,
                          },
                        ]}
                        onPress={() => {
                          const today = new Date();
                          const monthFromNow = new Date();
                          monthFromNow.setMonth(today.getMonth() + 1);
                          setTempStartDate(today);
                          setTempEndDate(monthFromNow);
                        }}>
                        <Text
                          style={[
                            styles.quickOptionText,
                            {
                              color: isDark
                                ? theme.colors.text.dark
                                : theme.colors.gray[700],
                            },
                          ]}>
                          Next Month
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>

              {/* Action Buttons */}
              {(Platform.OS === 'ios' || mode === 'range') && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.cancelButton,
                      {
                        borderColor: isDark
                          ? theme.colors.border.dark
                          : theme.colors.border.light,
                      },
                    ]}
                    onPress={handleCancel}>
                    <Text
                      style={[
                        styles.buttonText,
                        {
                          color: isDark
                            ? theme.colors.text.dark
                            : theme.colors.gray[700],
                        },
                      ]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.applyButton,
                      {
                        backgroundColor: theme.colors.primary[500],
                      },
                    ]}
                    onPress={handleApply}>
                    <Text
                      style={[styles.buttonText, {color: theme.colors.white}]}>
                      Apply
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    flex: 1,
    marginRight: theme.spacing[2],
  },
  dateText: {
    marginLeft: theme.spacing[2],
    fontSize: theme.typography.fontSize.base - 1,
    fontWeight: '500',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingBottom: Platform.OS === 'ios' ? 34 : theme.spacing[4],
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    padding: theme.spacing[4],
    paddingBottom: 0,
  },
  tab: {
    flex: 1,
    padding: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    marginHorizontal: theme.spacing[1],
    alignItems: 'center',
  },
  tabText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    marginBottom: theme.spacing[0.5],
  },
  tabDate: {
    fontSize: theme.typography.fontSize.xs,
  },
  pickerContainer: {
    padding: theme.spacing[4],
    minHeight: 200,
  },
  quickOptionsContainer: {
    padding: theme.spacing[4],
    paddingTop: 0,
  },
  quickOptionsTitle: {
    fontSize: theme.typography.fontSize.sm,
    marginBottom: theme.spacing[2],
  },
  quickOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quickOption: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1.5],
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing[2],
    marginBottom: theme.spacing[2],
  },
  quickOptionText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: theme.spacing[4],
    paddingTop: 0,
  },
  button: {
    flex: 1,
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginHorizontal: theme.spacing[1],
  },
  cancelButton: {
    borderWidth: 1,
  },
  applyButton: {},
  buttonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
  },
});

export default DateRangePicker;
