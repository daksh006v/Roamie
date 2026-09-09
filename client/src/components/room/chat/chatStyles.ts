import { StyleSheet, Platform, Dimensions } from 'react-native';

export const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2', // Warm parchment canvas (Image 1)
  },

  /* ═══ Background Contour Watermark ═══ */
  contourWatermark: {
    position: 'absolute',
    bottom: 50,
    right: 0,
    left: 0,
    height: 350,
    zIndex: 0,
  },

  /* ═══ Top Header (Image 1 & 2) ═══ */
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF7F2',
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDE5D8',
    zIndex: 10,
  },
  backButton: {
    padding: 4,
    marginRight: 6,
  },
  headerThumbnail: {
    width: 38,
    height: 38,
    borderRadius: 12,
    marginRight: 10,
    backgroundColor: '#E5D8C7',
  },
  headerThumbnailFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerThumbnailEmoji: {
    fontSize: 18,
  },
  headerTitleBlock: {
    flex: 1,
    marginRight: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#17251F',
    letterSpacing: 0.1,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#78716C',
    fontWeight: '500',
    marginTop: 1,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 2,
  },

  /* ═══ Next Up Banner (Image 1) ═══ */
  nextUpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5EFE6',
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EAE0D2',
    zIndex: 5,
  },
  nextUpContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  nextUpPinIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  nextUpText: {
    fontSize: 13,
    color: '#243C32',
    flex: 1,
  },
  nextUpBold: {
    fontWeight: '700',
    color: '#17251F',
  },
  pinnedCountBadge: {
    backgroundColor: '#EDE5D8',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 6,
  },
  pinnedCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78716C',
  },

  /* ═══ Chat Body & Messages ═══ */
  chatBody: {
    flex: 1,
    zIndex: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#78716C',
  },
  loadMoreContainer: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  messagesListEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  /* ═══ Date Divider ═══ */
  dateSeparatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2D7C8',
  },
  dateSeparatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8C8275',
    marginHorizontal: 12,
  },

  /* ═══ Message Item Row (Image 1) ═══ */
  swipeRowWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  messageOuterContainer: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
  },
  messageHighlightBg: {
    backgroundColor: '#F3E5D5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8D2C0',
  },
  swipeReplyIconContainer: {
    position: 'absolute',
    left: 4,
    top: '30%',
    zIndex: 1,
  },
  swipeReplyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F7EDE4',
    borderWidth: 1,
    borderColor: '#E8D2C2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 12,
    backgroundColor: '#E5D8C7',
    marginTop: 1,
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  messageContentCol: {
    flex: 1,
  },
  senderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  senderName: {
    fontSize: 15,
    fontWeight: '700',
    marginRight: 8,
    lineHeight: 18,
  },
  messageTimestamp: {
    fontSize: 11,
    color: '#8C867A',
    fontWeight: '400',
    lineHeight: 14,
  },
  messageBodyText: {
    fontSize: 15,
    color: '#17251F',
    lineHeight: 21,
    letterSpacing: 0.1,
  },

  /* ═══ In-Feed Reply Thread (Discord Style) ═══ */
  inFeedReplyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    paddingLeft: 18,
  },
  inFeedReplyCurve: {
    width: 16,
    height: 14,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderTopLeftRadius: 8,
    borderColor: '#B5ACA0',
    marginRight: 6,
    marginTop: 5,
  },
  inFeedReplySnippetBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFE7DC',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: '85%',
  },
  inFeedReplyAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: '#243C32',
    marginRight: 6,
  },
  inFeedReplyText: {
    fontSize: 12,
    color: '#59615A',
    flexShrink: 1,
  },

  /* ═══ Rich Card (Image 1 Stay / Place) ═══ */
  richCardContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EADBCB',
    marginTop: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  richCardImage: {
    width: 135,
    height: 105,
    backgroundColor: '#EDE5D8',
  },
  richCardDetails: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  richCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  richCardIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  richCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#17251F',
    flex: 1,
  },
  richCardLocation: {
    fontSize: 11.5,
    color: '#78716C',
    marginBottom: 2,
  },
  richCardDescription: {
    fontSize: 11,
    color: '#8C8275',
    marginBottom: 6,
    lineHeight: 14,
  },
  richCardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FDF7F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EED9C7',
  },
  richCardActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C96A25',
  },
  photoAttachmentCard: {
    marginTop: 6,
    borderRadius: 14,
    overflow: 'hidden',
    maxWidth: SCREEN_WIDTH * 0.7,
  },
  photoAttachmentImage: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    backgroundColor: '#EDE5D8',
  },

  /* ═══ Reaction Pills (Image 1) ═══ */
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5D8C7',
    paddingHorizontal: 9,
    paddingVertical: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 0.5,
  },
  reactionPillActive: {
    backgroundColor: '#FDF3EB',
    borderColor: '#C96A25',
  },
  reactionPillEmoji: {
    fontSize: 13,
    marginRight: 4,
  },
  reactionPillCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  reactionPillCountActive: {
    color: '#C96A25',
  },

  /* ═══ System Message Pill ═══ */
  systemMsgContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  systemMsgPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE5D8',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  systemMsgText: {
    fontSize: 12,
    color: '#59615A',
    fontWeight: '500',
  },

  /* ═══ Reply Preview Banner (Image 5) ═══ */
  replyBannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EDE5D8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    marginHorizontal: 10,
    marginBottom: -2,
    borderWidth: 1,
    borderColor: '#DFD5C5',
    borderBottomWidth: 0,
  },
  replyBannerLeft: {
    flex: 1,
    marginRight: 8,
  },
  replyBannerTitle: {
    fontSize: 13,
    color: '#59615A',
  },
  replyBannerAuthor: {
    fontWeight: '800',
    color: '#17251F',
  },
  replyBannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mentionBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  mentionBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
  },
  replyCloseCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ═══ Bottom Input Bar (Image 1 & 2) ═══ */
  inputBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FAF7F2',
    borderTopWidth: 1,
    borderTopColor: '#EDE5D8',
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  attachCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDE5D8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  inputCapsule: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E5D8C7',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 9 : 5,
    marginRight: 8,
    maxHeight: 110,
    justifyContent: 'center',
  },
  textInputField: {
    fontSize: 15,
    color: '#17251F',
    lineHeight: 20,
    maxHeight: 90,
    padding: 0,
  },
  inputRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputMediaBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#C96A25', // Terracotta Send Button (Image 1 & 2)
  },
  sendCircleBtnActive: {
    backgroundColor: '#C96A25',
  },
  sendCircleBtnIdle: {
    backgroundColor: '#C96A25',
    opacity: 0.85,
  },

  /* ═══ Attach Drawer ═══ */
  attachMenuDrawer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#EDE5D8',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  attachMenuItem: {
    alignItems: 'center',
    gap: 5,
  },
  attachMenuIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachMenuLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#59615A',
  },

  /* ═══ Typing Indicator ═══ */
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 5,
    backgroundColor: '#FAF7F2',
  },
  typingDots: {
    flexDirection: 'row',
    marginRight: 6,
    gap: 3,
  },
  typingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#8C867A',
  },
  typingText: {
    fontSize: 12,
    color: '#8C867A',
    fontStyle: 'italic',
  },

  /* ═══ Empty State ═══ */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 54,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#17251F',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13.5,
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2D7C8',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  restoreBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#C96A25',
  },
  quickPrompts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  quickPromptChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E5D8C7',
  },
  quickPromptText: {
    fontSize: 13,
    color: '#243C32',
    fontWeight: '600',
  },

  /* ═══ Long-Press Action Sheet (Image 3) ═══ */
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#232428', // Dark sleek Discord sheet (Image 3)
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 36 : 22,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4E5058',
    alignSelf: 'center',
    marginBottom: 14,
  },
  quickEmojisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  quickEmojiBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2B2D31',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickEmojiChar: {
    fontSize: 22,
  },
  sheetHintText: {
    fontSize: 12,
    color: '#949BA4',
    textAlign: 'center',
    marginBottom: 14,
  },
  actionsCardGroup: {
    backgroundColor: '#2B2D31',
    borderRadius: 14,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  actionIcon: {
    marginRight: 14,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F2F3F5',
  },
  actionDivider: {
    height: 1,
    backgroundColor: '#35373C',
    marginLeft: 48,
  },

  /* ═══ All Emojis Modal ═══ */
  allEmojisContainer: {
    backgroundColor: '#232428',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  allEmojisTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F2F3F5',
    textAlign: 'center',
    marginBottom: 16,
  },
  allEmojisGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 12,
  },
  gridEmojiItem: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#2B2D31',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridEmojiText: {
    fontSize: 24,
  },
});

