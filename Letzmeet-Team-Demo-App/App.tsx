import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";

type AppStage = "welcome" | "onboarding" | "app";
type Tab = "discover" | "matches" | "community" | "safety" | "profile";
type Language = "English" | "isiZulu" | "isiXhosa";

type DemoProfile = {
  id: string;
  name: string;
  age: number;
  location: string;
  distance: string;
  intention: string;
  bio: string;
  tags: string[];
  initials: string;
  accent: string;
  softAccent: string;
};

type DemoMessage = {
  id: string;
  sender: "me" | "them";
  text: string;
  time: string;
};

type DemoConversation = {
  profile: DemoProfile;
  messages: DemoMessage[];
  unread: number;
};

type CommunityPost = {
  id: string;
  author: string;
  initials: string;
  category: string;
  body: string;
  reactions: number;
  replies: number;
  accent: string;
};

const colours = {
  cream: "#FFF9F0",
  white: "#FFFFFF",
  navy: "#132C3A",
  teal: "#176B66",
  tealDark: "#0E514E",
  tealSoft: "#DFF3EE",
  coral: "#F17665",
  coralSoft: "#FFE6DF",
  lavender: "#E9E3F8",
  lavenderDark: "#6A54A3",
  gold: "#D99A31",
  inkMuted: "#60717A",
  border: "#E8E1D8",
  danger: "#B74444",
  dangerSoft: "#FCE9E7",
  success: "#23775F",
  shadow: "#09232F"
};

const profiles: DemoProfile[] = [
  {
    id: "naledi",
    name: "Naledi",
    age: 29,
    location: "Johannesburg",
    distance: "Within 10 km",
    intention: "A committed relationship",
    bio: "Bookshop wanderer, Sunday cook and believer in honest conversations. I value kindness, humour and people who communicate clearly.",
    tags: ["Books", "Cooking", "Live music"],
    initials: "NM",
    accent: "#A66370",
    softAccent: "#F7E2E7"
  },
  {
    id: "thabo",
    name: "Thabo",
    age: 32,
    location: "Soweto",
    distance: "Within 15 km",
    intention: "Dating with intention",
    bio: "IT professional, cyclist and amateur photographer. Looking for someone who enjoys building a calm and supportive partnership.",
    tags: ["Cycling", "Photography", "Coffee"],
    initials: "TK",
    accent: "#2E7180",
    softAccent: "#DCEFF2"
  },
  {
    id: "amahle",
    name: "Amahle",
    age: 27,
    location: "Midrand",
    distance: "Within 20 km",
    intention: "Friendship that can grow",
    bio: "Designer, plant parent and weekend explorer. I enjoy thoughtful people, small adventures and laughing at terrible movies.",
    tags: ["Design", "Travel", "Plants"],
    initials: "AD",
    accent: "#8067A7",
    softAccent: "#EDE7F7"
  },
  {
    id: "sipho",
    name: "Sipho",
    age: 31,
    location: "Pretoria",
    distance: "Within 35 km",
    intention: "Long-term connection",
    bio: "Teacher, football fan and family person. I am here for a respectful connection where both people can be themselves.",
    tags: ["Teaching", "Football", "Family"],
    initials: "SM",
    accent: "#447653",
    softAccent: "#E2F0E5"
  }
];

const initialConversations: DemoConversation[] = [
  {
    profile: profiles[3],
    unread: 1,
    messages: [
      {
        id: "s1",
        sender: "them",
        text: "Hi! I saw that you also enjoy live music. What have you been listening to lately?",
        time: "18:42"
      }
    ]
  }
];

const communityPosts: CommunityPost[] = [
  {
    id: "p1",
    author: "Lerato",
    initials: "LM",
    category: "Small wins",
    body: "I went on my first date in a long time and felt completely respected. Sharing this for anyone who needs a little hope today.",
    reactions: 46,
    replies: 12,
    accent: "#A66370"
  },
  {
    id: "p2",
    author: "Kagiso",
    initials: "KM",
    category: "Community question",
    body: "What helps you decide when you are ready to share something private with a new match?",
    reactions: 31,
    replies: 19,
    accent: "#2E7180"
  },
  {
    id: "p3",
    author: "Anonymous member",
    initials: "A",
    category: "Encouragement",
    body: "Your diagnosis did not reduce your worth. Take your time, keep your boundaries and choose people who make honesty feel safe.",
    reactions: 87,
    replies: 8,
    accent: "#8067A7"
  }
];

const onboardingCards = [
  {
    eyebrow: "PRIVACY FIRST",
    title: "Your story stays yours",
    body: "Health disclosure is optional. You decide if, when and with whom private information is shared.",
    icon: "◉",
    colour: colours.tealSoft,
    ink: colours.teal
  },
  {
    eyebrow: "HONEST CONNECTION",
    title: "Meet without shame",
    body: "Discover adults who value respect, consent and clear communication—without public labels or exact-location exposure.",
    icon: "♡",
    colour: colours.coralSoft,
    ink: colours.coral
  },
  {
    eyebrow: "COMMUNITY CARE",
    title: "Safety is part of belonging",
    body: "Blocking, reporting and safety tools remain easy to reach. Community rules protect dignity and choice.",
    icon: "⌁",
    colour: colours.lavender,
    ink: colours.lavenderDark
  }
];

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.logoRow}>
      <View style={[styles.logoMark, compact && styles.logoMarkCompact]}>
        <Text style={[styles.logoHeart, compact && styles.logoHeartCompact]}>
          ♡
        </Text>
      </View>
      <Text style={[styles.logoText, compact && styles.logoTextCompact]}>
        LETZMEET
      </Text>
    </View>
  );
}

function DemoPill() {
  return (
    <View style={styles.demoPill}>
      <View style={styles.demoDot} />
      <Text style={styles.demoPillText}>TEAM DEMO · FICTIONAL DATA</Text>
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  secondary = false,
  destructive = false,
  disabled = false,
  compact = false
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        secondary && styles.secondaryButton,
        destructive && styles.destructiveButton,
        compact && styles.compactButton,
        (pressed || disabled) && styles.buttonPressed
      ]}
    >
      <Text
        style={[
          styles.primaryButtonText,
          secondary && styles.secondaryButtonText
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Chip({
  label,
  selected = false,
  onPress
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const contents = (
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
      {label}
    </Text>
  );

  if (!onPress) {
    return (
      <View style={[styles.chip, selected && styles.chipSelected]}>
        {contents}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.chipPressed
      ]}
    >
      {contents}
    </Pressable>
  );
}

function SectionTitle({
  eyebrow,
  title,
  body
}: {
  eyebrow?: string;
  title: string;
  body?: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text accessibilityRole="header" style={styles.screenTitle}>
        {title}
      </Text>
      {body ? <Text style={styles.screenBody}>{body}</Text> : null}
    </View>
  );
}

function Avatar({
  profile,
  size = "large"
}: {
  profile: DemoProfile;
  size?: "small" | "medium" | "large";
}) {
  return (
    <LinearGradient
      colors={[profile.softAccent, profile.accent]}
      start={{ x: 0.1, y: 0.1 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.avatar,
        size === "small" && styles.avatarSmall,
        size === "medium" && styles.avatarMedium
      ]}
    >
      <View style={styles.avatarHalo} />
      <Text
        style={[
          styles.avatarInitials,
          size === "small" && styles.avatarInitialsSmall,
          size === "medium" && styles.avatarInitialsMedium
        ]}
      >
        {profile.initials}
      </Text>
      {size === "large" ? (
        <View style={styles.avatarCaption}>
          <Text style={styles.avatarCaptionText}>Fictional profile</Text>
        </View>
      ) : null}
    </LinearGradient>
  );
}

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <LinearGradient
      colors={[colours.cream, "#F3FBF8", colours.coralSoft]}
      locations={[0, 0.62, 1]}
      style={styles.flex}
    >
      <SafeAreaView style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.welcomeContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.welcomeTop}>
            <Logo />
            <DemoPill />
          </View>

          <View style={styles.heroVisual}>
            <View style={[styles.orbit, styles.orbitOne]} />
            <View style={[styles.orbit, styles.orbitTwo]} />
            <View style={[styles.heroPerson, styles.heroPersonLeft]}>
              <Text style={styles.heroPersonText}>N</Text>
            </View>
            <View style={[styles.heroPerson, styles.heroPersonRight]}>
              <Text style={styles.heroPersonText}>T</Text>
            </View>
            <View style={styles.heroHeart}>
              <Text style={styles.heroHeartText}>♡</Text>
            </View>
          </View>

          <Text style={styles.welcomeEyebrow}>PRIVATE · RESPECTFUL · HUMAN</Text>
          <Text style={styles.welcomeTitle}>
            Let’s meet{"\n"}
            <Text style={styles.welcomeTitleAccent}>without shame.</Text>
          </Text>
          <Text style={styles.welcomeBody}>
            A safer, kinder space for honest dating, friendship and community.
          </Text>

          <PrimaryButton label="Explore the team demo" onPress={onStart} />
          <Text style={styles.welcomeFootnote}>
            All profiles, messages and posts in this demonstration are
            fictional.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function OnboardingScreen({
  step,
  setStep,
  onComplete
}: {
  step: number;
  setStep: (step: number) => void;
  onComplete: () => void;
}) {
  const card = onboardingCards[step];
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.onboardingHeader}>
        <Logo compact />
        <DemoPill />
      </View>
      <View style={styles.progressRow}>
        {onboardingCards.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressBar,
              index <= step && styles.progressBarActive
            ]}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.onboardingContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.onboardingIcon, { backgroundColor: card.colour }]}>
          <Text style={[styles.onboardingIconText, { color: card.ink }]}>
            {card.icon}
          </Text>
        </View>
        <Text style={[styles.onboardingEyebrow, { color: card.ink }]}>
          {card.eyebrow}
        </Text>
        <Text style={styles.onboardingTitle}>{card.title}</Text>
        <Text style={styles.onboardingBody}>{card.body}</Text>

        {step === 0 ? (
          <View style={styles.choiceCard}>
            <Text style={styles.choiceIcon}>✓</Text>
            <View style={styles.flex}>
              <Text style={styles.choiceTitle}>Visible to matches only</Text>
              <Text style={styles.choiceBody}>
                A safe default that can be changed later.
              </Text>
            </View>
          </View>
        ) : null}

        {step === 1 ? (
          <View style={styles.chipWrap}>
            <Chip label="Committed relationship" selected />
            <Chip label="Dating with intention" />
            <Chip label="Friendship" />
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.commitmentList}>
            {[
              "Respect privacy and consent",
              "No outing, blackmail or harassment",
              "Report behaviour that threatens safety"
            ].map((item) => (
              <View key={item} style={styles.commitmentRow}>
                <Text style={styles.commitmentCheck}>✓</Text>
                <Text style={styles.commitmentText}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.onboardingActions}>
        {step > 0 ? (
          <PrimaryButton
            label="Back"
            secondary
            compact
            onPress={() => setStep(step - 1)}
          />
        ) : null}
        <View style={styles.flex}>
          <PrimaryButton
            label={step === onboardingCards.length - 1 ? "Enter Letzmeet" : "Continue"}
            onPress={() =>
              step === onboardingCards.length - 1
                ? onComplete()
                : setStep(step + 1)
            }
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function DiscoverScreen({
  profile,
  remaining,
  onPass,
  onLike,
  onDetails
}: {
  profile: DemoProfile | undefined;
  remaining: number;
  onPass: () => void;
  onLike: () => void;
  onDetails: () => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.screenContent}
      showsVerticalScrollIndicator={false}
    >
      <SectionTitle
        eyebrow="DISCOVER"
        title="People, not labels"
        body="Profiles show what someone chooses to share. Exact location and health information remain private."
      />

      {profile ? (
        <View style={styles.profileCard}>
          <Avatar profile={profile} />
          <View style={styles.profileCardBody}>
            <View style={styles.nameRow}>
              <View style={styles.flex}>
                <Text style={styles.profileName}>
                  {profile.name}, {profile.age}
                </Text>
                <Text style={styles.profileLocation}>
                  {profile.location} · {profile.distance}
                </Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓</Text>
              </View>
            </View>
            <Text style={styles.intention}>{profile.intention}</Text>
            <Text style={styles.profileBio} numberOfLines={3}>
              {profile.bio}
            </Text>
            <View style={styles.chipWrap}>
              {profile.tags.map((tag) => (
                <Chip key={tag} label={tag} />
              ))}
            </View>
            <Pressable onPress={onDetails} style={styles.textButton}>
              <Text style={styles.textButtonText}>View full profile →</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>♡</Text>
          <Text style={styles.emptyTitle}>You reached today’s demo limit</Text>
          <Text style={styles.emptyBody}>
            Reset the demo from Profile to show discovery again.
          </Text>
        </View>
      )}

      {profile ? (
        <View style={styles.discoveryActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Pass ${profile.name}`}
            onPress={onPass}
            style={({ pressed }) => [
              styles.roundAction,
              styles.passAction,
              pressed && styles.actionPressed
            ]}
          >
            <Text style={styles.passIcon}>×</Text>
            <Text style={styles.actionLabel}>Pass</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Like ${profile.name}`}
            onPress={onLike}
            style={({ pressed }) => [
              styles.roundAction,
              styles.likeAction,
              pressed && styles.actionPressed
            ]}
          >
            <Text style={styles.likeIcon}>♡</Text>
            <Text style={styles.likeActionLabel}>Like</Text>
          </Pressable>
        </View>
      ) : null}
      <Text style={styles.remainingText}>
        {remaining} fictional profile{remaining === 1 ? "" : "s"} remaining
      </Text>
    </ScrollView>
  );
}

function MatchesScreen({
  conversations,
  onOpenChat
}: {
  conversations: DemoConversation[];
  onOpenChat: (conversation: DemoConversation) => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.screenContent}
      showsVerticalScrollIndicator={false}
    >
      <SectionTitle
        eyebrow="CONNECTIONS"
        title="Matches"
        body="Only matched adults can start a private conversation."
      />

      <View style={styles.safetyNotice}>
        <Text style={styles.safetyNoticeIcon}>⌁</Text>
        <View style={styles.flex}>
          <Text style={styles.safetyNoticeTitle}>Private by design</Text>
          <Text style={styles.safetyNoticeBody}>
            Neutral notifications and one-tap safety controls protect
            discretion.
          </Text>
        </View>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>♡</Text>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptyBody}>
            Like Naledi in Discover to demonstrate a new match.
          </Text>
        </View>
      ) : (
        conversations.map((conversation) => {
          const last = conversation.messages[conversation.messages.length - 1];
          return (
            <Pressable
              key={conversation.profile.id}
              onPress={() => onOpenChat(conversation)}
              style={({ pressed }) => [
                styles.matchRow,
                pressed && styles.matchRowPressed
              ]}
            >
              <Avatar profile={conversation.profile} size="medium" />
              <View style={styles.matchCopy}>
                <View style={styles.matchTopRow}>
                  <Text style={styles.matchName}>
                    {conversation.profile.name}
                  </Text>
                  <Text style={styles.matchTime}>{last?.time ?? ""}</Text>
                </View>
                <Text style={styles.matchPreview} numberOfLines={1}>
                  {last?.sender === "me" ? "You: " : ""}
                  {last?.text ?? "You matched. Say hello!"}
                </Text>
              </View>
              {conversation.unread > 0 ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{conversation.unread}</Text>
                </View>
              ) : (
                <Text style={styles.chevron}>›</Text>
              )}
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

function CommunityScreen({
  reacted,
  onReact
}: {
  reacted: Set<string>;
  onReact: (post: CommunityPost) => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.screenContent}
      showsVerticalScrollIndicator={false}
    >
      <SectionTitle
        eyebrow="COMMUNITY"
        title="You are not alone"
        body="A moderated space for encouragement, questions and shared experience."
      />

      {communityPosts.map((post) => {
        const hasReacted = reacted.has(post.id);
        return (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <View
                style={[styles.postAvatar, { backgroundColor: post.accent }]}
              >
                <Text style={styles.postAvatarText}>{post.initials}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.postAuthor}>{post.author}</Text>
                <Text style={styles.postCategory}>{post.category}</Text>
              </View>
              <Text style={styles.postMenu}>•••</Text>
            </View>
            <Text style={styles.postBody}>{post.body}</Text>
            <View style={styles.postFooter}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  hasReacted ? "Remove heart" : "Support this post"
                }
                onPress={() => onReact(post)}
                style={[
                  styles.postAction,
                  hasReacted && styles.postActionSelected
                ]}
              >
                <Text
                  style={[
                    styles.postActionText,
                    hasReacted && styles.postActionTextSelected
                  ]}
                >
                  {hasReacted ? "♥" : "♡"}{" "}
                  {post.reactions + (hasReacted ? 1 : 0)}
                </Text>
              </Pressable>
              <View style={styles.postAction}>
                <Text style={styles.postActionText}>
                  ◌ {post.replies} replies
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function SafetyScreen({
  checkInActive,
  setCheckInActive
}: {
  checkInActive: boolean;
  setCheckInActive: (value: boolean) => void;
}) {
  const reportDemo = () =>
    Alert.alert(
      "Demonstration report",
      "In production, this opens the encrypted reporting flow and can block the reported account immediately.",
      [{ text: "Understood" }]
    );

  return (
    <ScrollView
      contentContainerStyle={styles.screenContent}
      showsVerticalScrollIndicator={false}
    >
      <SectionTitle
        eyebrow="SAFETY CENTRE"
        title="Support within reach"
        body="Safety tools are available to everyone and never require a paid subscription."
      />

      <LinearGradient
        colors={[colours.teal, colours.tealDark]}
        style={styles.checkInCard}
      >
        <View style={styles.checkInTop}>
          <View>
            <Text style={styles.checkInEyebrow}>SAFE-DATE CHECK-IN</Text>
            <Text style={styles.checkInTitle}>
              {checkInActive ? "Check-in scheduled" : "Plan a safer meeting"}
            </Text>
          </View>
          <Text style={styles.checkInIcon}>{checkInActive ? "✓" : "⌁"}</Text>
        </View>
        <Text style={styles.checkInBody}>
          {checkInActive
            ? "Your fictional trusted contact will expect confirmation at 21:00."
            : "Choose a trusted contact and a time to confirm that you are safe."}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setCheckInActive(!checkInActive);
            Alert.alert(
              checkInActive ? "Check-in cancelled" : "Demo check-in scheduled",
              checkInActive
                ? "The fictional reminder has been removed."
                : "The demo will show a reminder for 21:00. No real notification will be sent."
            );
          }}
          style={styles.checkInButton}
        >
          <Text style={styles.checkInButtonText}>
            {checkInActive ? "Cancel demo check-in" : "Schedule demo check-in"}
          </Text>
        </Pressable>
      </LinearGradient>

      <Text style={styles.groupTitle}>Account safety</Text>
      <View style={styles.safetyGrid}>
        <Pressable onPress={reportDemo} style={styles.safetyActionCard}>
          <View
            style={[
              styles.safetyActionIcon,
              { backgroundColor: colours.dangerSoft }
            ]}
          >
            <Text style={{ color: colours.danger, fontSize: 24 }}>!</Text>
          </View>
          <Text style={styles.safetyActionTitle}>Report</Text>
          <Text style={styles.safetyActionBody}>
            Report harassment, outing, scams or threats.
          </Text>
        </Pressable>
        <Pressable
          onPress={() =>
            Alert.alert(
              "Blocking demonstration",
              "Blocking removes discovery, matching, messaging and private-access permissions immediately."
            )
          }
          style={styles.safetyActionCard}
        >
          <View
            style={[
              styles.safetyActionIcon,
              { backgroundColor: colours.lavender }
            ]}
          >
            <Text style={{ color: colours.lavenderDark, fontSize: 22 }}>⊘</Text>
          </View>
          <Text style={styles.safetyActionTitle}>Block</Text>
          <Text style={styles.safetyActionBody}>
            Stop contact without notifying the other person.
          </Text>
        </Pressable>
      </View>

      <View style={styles.helpCard}>
        <Text style={styles.helpIcon}>i</Text>
        <View style={styles.flex}>
          <Text style={styles.helpTitle}>Immediate danger?</Text>
          <Text style={styles.helpBody}>
            Letzmeet does not promise automatic emergency response. Production
            provides a clear one-tap local emergency-services action.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function SettingRow({
  title,
  body,
  value,
  onValueChange
}: {
  title: string;
  body: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingBody}>{body}</Text>
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#D7D3CE", true: "#7DB9AE" }}
        thumbColor={value ? colours.teal : "#F4F2EF"}
      />
    </View>
  );
}

function ProfileScreen({
  language,
  setLanguage,
  disclosureMatchesOnly,
  setDisclosureMatchesOnly,
  readReceipts,
  setReadReceipts,
  onReset
}: {
  language: Language;
  setLanguage: (language: Language) => void;
  disclosureMatchesOnly: boolean;
  setDisclosureMatchesOnly: (value: boolean) => void;
  readReceipts: boolean;
  setReadReceipts: (value: boolean) => void;
  onReset: () => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.screenContent}
      showsVerticalScrollIndicator={false}
    >
      <SectionTitle eyebrow="MY SPACE" title="Profile and privacy" />

      <View style={styles.myProfileCard}>
        <LinearGradient
          colors={[colours.coralSoft, colours.coral]}
          style={styles.myAvatar}
        >
          <Text style={styles.myAvatarText}>PK</Text>
        </LinearGradient>
        <View style={styles.flex}>
          <Text style={styles.myName}>Phumlane, 25+</Text>
          <Text style={styles.myMeta}>Johannesburg · Demo profile</Text>
          <Text style={styles.profileComplete}>✓ Profile ready for demo</Text>
        </View>
      </View>

      <Text style={styles.groupTitle}>Privacy controls</Text>
      <View style={styles.settingsCard}>
        <SettingRow
          title="Private disclosure"
          body={
            disclosureMatchesOnly
              ? "Visible only after a mutual match"
              : "Hidden until manually shared"
          }
          value={disclosureMatchesOnly}
          onValueChange={setDisclosureMatchesOnly}
        />
        <View style={styles.settingsDivider} />
        <SettingRow
          title="Read receipts"
          body="Only activate when both people consent"
          value={readReceipts}
          onValueChange={setReadReceipts}
        />
      </View>

      <Text style={styles.groupTitle}>Language</Text>
      <View style={styles.chipWrap}>
        {(["English", "isiZulu", "isiXhosa"] as Language[]).map((item) => (
          <Chip
            key={item}
            label={item}
            selected={language === item}
            onPress={() => setLanguage(item)}
          />
        ))}
      </View>

      <View style={styles.demoInformation}>
        <Text style={styles.demoInformationTitle}>About this build</Text>
        <Text style={styles.demoInformationBody}>
          This team-demo build stores nothing remotely. Restarting the app
          clears all demonstration changes.
        </Text>
      </View>

      <PrimaryButton label="Reset demo" secondary onPress={onReset} />
    </ScrollView>
  );
}

function AppHeader({
  title,
  onOpenSafety
}: {
  title: string;
  onOpenSafety: () => void;
}) {
  return (
    <View style={styles.appHeader}>
      <View>
        <Logo compact />
        <Text style={styles.headerContext}>{title}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Safety Centre"
        onPress={onOpenSafety}
        style={styles.headerShield}
      >
        <Text style={styles.headerShieldText}>⌁</Text>
      </Pressable>
    </View>
  );
}

const navItems: { tab: Tab; icon: string; label: string }[] = [
  { tab: "discover", icon: "◇", label: "Discover" },
  { tab: "matches", icon: "♡", label: "Matches" },
  { tab: "community", icon: "◌", label: "Community" },
  { tab: "safety", icon: "⌁", label: "Safety" },
  { tab: "profile", icon: "○", label: "Profile" }
];

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) {
  return (
    <View style={styles.bottomNav}>
      {navItems.map((item) => {
        const active = tab === item.tab;
        return (
          <Pressable
            key={item.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={item.label}
            onPress={() => setTab(item.tab)}
            style={styles.navItem}
          >
            <Text style={[styles.navIcon, active && styles.navIconActive]}>
              {item.icon}
            </Text>
            <Text style={[styles.navLabel, active && styles.navLabelActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ProfileDetailsModal({
  profile,
  visible,
  onClose,
  onLike
}: {
  profile: DemoProfile | undefined;
  visible: boolean;
  onClose: () => void;
  onLike: () => void;
}) {
  if (!profile) return null;
  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Profile</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Avatar profile={profile} />
          <Text style={styles.modalProfileName}>
            {profile.name}, {profile.age}
          </Text>
          <Text style={styles.profileLocation}>
            {profile.location} · {profile.distance}
          </Text>
          <Text style={styles.intention}>{profile.intention}</Text>
          <Text style={styles.modalBio}>{profile.bio}</Text>
          <View style={styles.chipWrap}>
            {profile.tags.map((tag) => (
              <Chip key={tag} label={tag} />
            ))}
          </View>
          <View style={styles.privacyCard}>
            <Text style={styles.privacyCardIcon}>◉</Text>
            <View style={styles.flex}>
              <Text style={styles.privacyCardTitle}>Privacy respected</Text>
              <Text style={styles.privacyCardBody}>
                This profile does not display health information or exact
                location. Any private disclosure requires a deliberate choice.
              </Text>
            </View>
          </View>
          <PrimaryButton
            label={`Like ${profile.name}`}
            onPress={() => {
              onLike();
              onClose();
            }}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function MatchModal({
  profile,
  visible,
  onClose,
  onMessage
}: {
  profile: DemoProfile | undefined;
  visible: boolean;
  onClose: () => void;
  onMessage: () => void;
}) {
  if (!profile) return null;
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.matchModalOverlay}>
        <View style={styles.matchModalCard}>
          <Text style={styles.matchModalHeart}>♡</Text>
          <Text style={styles.matchModalEyebrow}>IT’S A MATCH</Text>
          <Text style={styles.matchModalTitle}>
            You and {profile.name} chose each other
          </Text>
          <Text style={styles.matchModalBody}>
            Start with respect. Private information is never shared
            automatically.
          </Text>
          <View style={styles.matchFaces}>
            <LinearGradient
              colors={[colours.coralSoft, colours.coral]}
              style={styles.matchFace}
            >
              <Text style={styles.matchFaceText}>PK</Text>
            </LinearGradient>
            <Avatar profile={profile} size="medium" />
          </View>
          <PrimaryButton label="Send a message" onPress={onMessage} />
          <PrimaryButton label="Keep discovering" secondary onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function ChatModal({
  conversation,
  visible,
  onClose,
  onSend
}: {
  conversation: DemoConversation | null;
  visible: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");
  if (!conversation) return null;
  return (
    <Modal
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.chatSafeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.chatHeader}>
            <Pressable onPress={onClose} style={styles.chatBack}>
              <Text style={styles.chatBackText}>‹</Text>
            </Pressable>
            <Avatar profile={conversation.profile} size="small" />
            <View style={styles.flex}>
              <Text style={styles.chatName}>{conversation.profile.name}</Text>
              <Text style={styles.chatStatus}>Demo conversation · matched</Text>
            </View>
            <Pressable
              onPress={() =>
                Alert.alert(
                  "Conversation safety",
                  "Block and report controls would be available here."
                )
              }
              style={styles.chatSafety}
            >
              <Text style={styles.chatSafetyText}>⌁</Text>
            </Pressable>
          </View>
          <View style={styles.chatPrivacy}>
            <Text style={styles.chatPrivacyText}>
              Private disclosure is never sent automatically.
            </Text>
          </View>
          <ScrollView contentContainerStyle={styles.chatMessages}>
            <Text style={styles.chatDay}>TODAY</Text>
            {conversation.messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageBubble,
                  message.sender === "me"
                    ? styles.myMessage
                    : styles.theirMessage
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.sender === "me" && styles.myMessageText
                  ]}
                >
                  {message.text}
                </Text>
                <Text
                  style={[
                    styles.messageTime,
                    message.sender === "me" && styles.myMessageTime
                  ]}
                >
                  {message.time}
                </Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.composer}>
            <TextInput
              accessibilityLabel="Message"
              value={draft}
              onChangeText={setDraft}
              placeholder={`Message ${conversation.profile.name}`}
              placeholderTextColor="#8A969C"
              style={styles.composerInput}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send message"
              disabled={!draft.trim()}
              onPress={() => {
                if (!draft.trim()) return;
                onSend(draft.trim());
                setDraft("");
              }}
              style={({ pressed }) => [
                styles.sendButton,
                (!draft.trim() || pressed) && styles.sendButtonMuted
              ]}
            >
              <Text style={styles.sendButtonText}>↑</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

export default function App() {
  const [stage, setStage] = useState<AppStage>("welcome");
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [tab, setTab] = useState<Tab>("discover");
  const [profileIndex, setProfileIndex] = useState(0);
  const [conversations, setConversations] =
    useState<DemoConversation[]>(initialConversations);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [matchedProfile, setMatchedProfile] =
    useState<DemoProfile | undefined>();
  const [matchVisible, setMatchVisible] = useState(false);
  const [chatProfileId, setChatProfileId] = useState<string | null>(null);
  const [reactedPosts, setReactedPosts] = useState<Set<string>>(new Set());
  const [checkInActive, setCheckInActive] = useState(false);
  const [language, setLanguage] = useState<Language>("English");
  const [disclosureMatchesOnly, setDisclosureMatchesOnly] = useState(true);
  const [readReceipts, setReadReceipts] = useState(false);

  const currentProfile = profiles[profileIndex];
  const activeConversation =
    conversations.find(
      (conversation) => conversation.profile.id === chatProfileId
    ) ?? null;

  const headerTitle = useMemo(() => {
    const labels: Record<Tab, string> = {
      discover: "Discover",
      matches: "Matches",
      community: "Community",
      safety: "Safety Centre",
      profile: "My space"
    };
    return labels[tab];
  }, [tab]);

  const moveNext = () => setProfileIndex((index) => index + 1);

  const likeCurrentProfile = () => {
    if (!currentProfile) return;
    const isMatch = currentProfile.id === "naledi";

    if (isMatch) {
      setConversations((items) => {
        if (items.some((item) => item.profile.id === currentProfile.id)) {
          return items;
        }
        return [
          {
            profile: currentProfile,
            unread: 0,
            messages: [
              {
                id: "n1",
                sender: "them",
                text: "We matched! Your profile made me smile. How is your week going?",
                time: "Now"
              }
            ]
          },
          ...items
        ];
      });
      setMatchedProfile(currentProfile);
      setMatchVisible(true);
    } else {
      Alert.alert(
        "Like sent",
        `${currentProfile.name} will only see this if the interest becomes mutual.`
      );
    }
    moveNext();
  };

  const openChat = (conversation: DemoConversation) => {
    setConversations((items) =>
      items.map((item) =>
        item.profile.id === conversation.profile.id
          ? { ...item, unread: 0 }
          : item
      )
    );
    setChatProfileId(conversation.profile.id);
  };

  const sendMessage = (text: string) => {
    if (!chatProfileId) return;
    setConversations((items) =>
      items.map((conversation) =>
        conversation.profile.id === chatProfileId
          ? {
              ...conversation,
              messages: [
                ...conversation.messages,
                {
                  id: `message-${Date.now()}`,
                  sender: "me",
                  text,
                  time: "Now"
                }
              ]
            }
          : conversation
      )
    );
  };

  const resetDemo = () => {
    Alert.alert(
      "Reset team demo?",
      "Likes, messages and presentation choices will return to their starting state.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            setStage("welcome");
            setOnboardingStep(0);
            setTab("discover");
            setProfileIndex(0);
            setConversations(initialConversations);
            setDetailsVisible(false);
            setMatchedProfile(undefined);
            setMatchVisible(false);
            setChatProfileId(null);
            setReactedPosts(new Set());
            setCheckInActive(false);
            setLanguage("English");
            setDisclosureMatchesOnly(true);
            setReadReceipts(false);
          }
        }
      ]
    );
  };

  if (stage === "welcome") {
    return (
      <>
        <StatusBar style="dark" />
        <WelcomeScreen onStart={() => setStage("onboarding")} />
      </>
    );
  }

  if (stage === "onboarding") {
    return (
      <>
        <StatusBar style="dark" />
        <OnboardingScreen
          step={onboardingStep}
          setStep={setOnboardingStep}
          onComplete={() => setStage("app")}
        />
      </>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      {Platform.OS === "android" ? (
        <View style={{ height: NativeStatusBar.currentHeight ?? 0 }} />
      ) : null}
      <AppHeader title={headerTitle} onOpenSafety={() => setTab("safety")} />
      <DemoPill />
      <View style={styles.mainContent}>
        {tab === "discover" ? (
          <DiscoverScreen
            profile={currentProfile}
            remaining={Math.max(profiles.length - profileIndex, 0)}
            onPass={moveNext}
            onLike={likeCurrentProfile}
            onDetails={() => setDetailsVisible(true)}
          />
        ) : null}
        {tab === "matches" ? (
          <MatchesScreen
            conversations={conversations}
            onOpenChat={openChat}
          />
        ) : null}
        {tab === "community" ? (
          <CommunityScreen
            reacted={reactedPosts}
            onReact={(post) =>
              setReactedPosts((current) => {
                const next = new Set(current);
                if (next.has(post.id)) next.delete(post.id);
                else next.add(post.id);
                return next;
              })
            }
          />
        ) : null}
        {tab === "safety" ? (
          <SafetyScreen
            checkInActive={checkInActive}
            setCheckInActive={setCheckInActive}
          />
        ) : null}
        {tab === "profile" ? (
          <ProfileScreen
            language={language}
            setLanguage={setLanguage}
            disclosureMatchesOnly={disclosureMatchesOnly}
            setDisclosureMatchesOnly={setDisclosureMatchesOnly}
            readReceipts={readReceipts}
            setReadReceipts={setReadReceipts}
            onReset={resetDemo}
          />
        ) : null}
      </View>
      <BottomNav tab={tab} setTab={setTab} />

      <ProfileDetailsModal
        profile={currentProfile}
        visible={detailsVisible}
        onClose={() => setDetailsVisible(false)}
        onLike={likeCurrentProfile}
      />
      <MatchModal
        profile={matchedProfile}
        visible={matchVisible}
        onClose={() => setMatchVisible(false)}
        onMessage={() => {
          if (matchedProfile) {
            setChatProfileId(matchedProfile.id);
            setMatchVisible(false);
            setTab("matches");
          }
        }}
      />
      <ChatModal
        conversation={activeConversation}
        visible={Boolean(activeConversation)}
        onClose={() => setChatProfileId(null)}
        onSend={sendMessage}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: {
    flex: 1,
    backgroundColor: colours.cream
  },
  welcomeContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    justifyContent: "space-between"
  },
  welcomeTop: {
    gap: 14
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colours.teal
  },
  logoMarkCompact: {
    width: 34,
    height: 34,
    borderRadius: 12
  },
  logoHeart: {
    color: colours.white,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 34
  },
  logoHeartCompact: {
    fontSize: 21,
    lineHeight: 23
  },
  logoText: {
    color: colours.navy,
    fontSize: 21,
    letterSpacing: 2.8,
    fontWeight: "900"
  },
  logoTextCompact: {
    fontSize: 15,
    letterSpacing: 2.1
  },
  demoPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colours.lavender
  },
  demoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colours.lavenderDark
  },
  demoPillText: {
    color: colours.lavenderDark,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8
  },
  heroVisual: {
    alignSelf: "center",
    width: 260,
    height: 210,
    marginTop: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  orbit: {
    position: "absolute",
    borderWidth: 1.5,
    borderColor: "#C7DDD8",
    borderRadius: 999
  },
  orbitOne: {
    width: 230,
    height: 160,
    transform: [{ rotate: "-12deg" }]
  },
  orbitTwo: {
    width: 170,
    height: 195,
    transform: [{ rotate: "22deg" }]
  },
  heroPerson: {
    position: "absolute",
    width: 94,
    height: 124,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 5,
    borderColor: colours.white,
    shadowColor: colours.shadow,
    shadowOpacity: 0.13,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5
  },
  heroPersonLeft: {
    left: 36,
    top: 31,
    backgroundColor: "#B46F7B",
    transform: [{ rotate: "-7deg" }]
  },
  heroPersonRight: {
    right: 36,
    bottom: 27,
    backgroundColor: "#397887",
    transform: [{ rotate: "7deg" }]
  },
  heroPersonText: {
    color: colours.white,
    fontSize: 34,
    fontWeight: "900"
  },
  heroHeart: {
    zIndex: 3,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colours.coral,
    borderWidth: 5,
    borderColor: colours.cream,
    alignItems: "center",
    justifyContent: "center"
  },
  heroHeartText: {
    color: colours.white,
    fontSize: 31,
    fontWeight: "800",
    lineHeight: 33
  },
  welcomeEyebrow: {
    color: colours.teal,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.7,
    marginTop: 8
  },
  welcomeTitle: {
    color: colours.navy,
    fontSize: 43,
    lineHeight: 47,
    fontWeight: "900",
    letterSpacing: -1.7,
    marginTop: 8
  },
  welcomeTitleAccent: {
    color: colours.coral
  },
  welcomeBody: {
    color: colours.inkMuted,
    fontSize: 17,
    lineHeight: 25,
    marginTop: 13,
    marginBottom: 22
  },
  welcomeFootnote: {
    color: colours.inkMuted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 12
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 17,
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colours.teal
  },
  secondaryButton: {
    backgroundColor: colours.white,
    borderWidth: 1.2,
    borderColor: colours.border
  },
  destructiveButton: {
    backgroundColor: colours.danger
  },
  compactButton: {
    minHeight: 50,
    paddingHorizontal: 17
  },
  buttonPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.99 }]
  },
  primaryButtonText: {
    color: colours.white,
    fontSize: 15,
    fontWeight: "800"
  },
  secondaryButtonText: {
    color: colours.navy
  },
  onboardingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 16
  },
  progressRow: {
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 22
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colours.border
  },
  progressBarActive: {
    backgroundColor: colours.teal
  },
  onboardingContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 44,
    paddingBottom: 24,
    justifyContent: "center"
  },
  onboardingIcon: {
    width: 94,
    height: 94,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25
  },
  onboardingIconText: {
    fontSize: 50,
    fontWeight: "800"
  },
  onboardingEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.7,
    marginBottom: 8
  },
  onboardingTitle: {
    color: colours.navy,
    fontSize: 36,
    lineHeight: 41,
    fontWeight: "900",
    letterSpacing: -1.2
  },
  onboardingBody: {
    color: colours.inkMuted,
    fontSize: 17,
    lineHeight: 26,
    marginTop: 13,
    marginBottom: 24
  },
  choiceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    padding: 17,
    borderRadius: 18,
    backgroundColor: colours.white,
    borderWidth: 1.5,
    borderColor: colours.teal
  },
  choiceIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: "hidden",
    color: colours.white,
    backgroundColor: colours.teal,
    textAlign: "center",
    lineHeight: 28,
    fontWeight: "900"
  },
  choiceTitle: {
    color: colours.navy,
    fontSize: 15,
    fontWeight: "800"
  },
  choiceBody: {
    color: colours.inkMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3
  },
  onboardingActions: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: colours.border,
    backgroundColor: colours.cream
  },
  commitmentList: {
    gap: 12
  },
  commitmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 3
  },
  commitmentCheck: {
    color: colours.success,
    fontSize: 18,
    fontWeight: "900"
  },
  commitmentText: {
    flex: 1,
    color: colours.navy,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600"
  },
  appHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: colours.cream
  },
  headerContext: {
    marginTop: 3,
    color: colours.inkMuted,
    fontSize: 10,
    fontWeight: "700"
  },
  headerShield: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colours.tealSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  headerShieldText: {
    color: colours.teal,
    fontSize: 24,
    fontWeight: "900"
  },
  mainContent: {
    flex: 1
  },
  screenContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 30
  },
  sectionHeading: {
    marginBottom: 20
  },
  eyebrow: {
    color: colours.teal,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 6
  },
  screenTitle: {
    color: colours.navy,
    fontSize: 29,
    lineHeight: 34,
    fontWeight: "900",
    letterSpacing: -0.8
  },
  screenBody: {
    color: colours.inkMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7
  },
  profileCard: {
    overflow: "hidden",
    borderRadius: 26,
    backgroundColor: colours.white,
    borderWidth: 1,
    borderColor: colours.border,
    shadowColor: colours.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4
  },
  avatar: {
    height: 278,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  avatarMedium: {
    width: 58,
    height: 58,
    borderRadius: 20
  },
  avatarSmall: {
    width: 42,
    height: 42,
    borderRadius: 15
  },
  avatarHalo: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 22,
    borderColor: "rgba(255,255,255,0.20)"
  },
  avatarInitials: {
    color: colours.white,
    fontSize: 74,
    fontWeight: "900",
    letterSpacing: -2
  },
  avatarInitialsMedium: {
    fontSize: 20,
    letterSpacing: 0
  },
  avatarInitialsSmall: {
    fontSize: 15,
    letterSpacing: 0
  },
  avatarCaption: {
    position: "absolute",
    right: 13,
    bottom: 13,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(19,44,58,0.66)"
  },
  avatarCaptionText: {
    color: colours.white,
    fontSize: 9,
    fontWeight: "800"
  },
  profileCardBody: {
    padding: 18
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  profileName: {
    color: colours.navy,
    fontSize: 25,
    fontWeight: "900"
  },
  profileLocation: {
    color: colours.inkMuted,
    fontSize: 12,
    marginTop: 3
  },
  verifiedBadge: {
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colours.teal
  },
  verifiedText: {
    color: colours.white,
    fontSize: 13,
    fontWeight: "900"
  },
  intention: {
    alignSelf: "flex-start",
    color: colours.tealDark,
    fontSize: 12,
    fontWeight: "800",
    backgroundColor: colours.tealSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 13
  },
  profileBio: {
    color: colours.navy,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 13
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F5F1EB",
    borderWidth: 1,
    borderColor: colours.border
  },
  chipSelected: {
    backgroundColor: colours.teal,
    borderColor: colours.teal
  },
  chipPressed: {
    opacity: 0.7
  },
  chipText: {
    color: colours.navy,
    fontSize: 11,
    fontWeight: "700"
  },
  chipTextSelected: {
    color: colours.white
  },
  textButton: {
    marginTop: 15,
    paddingVertical: 4
  },
  textButtonText: {
    color: colours.teal,
    fontSize: 13,
    fontWeight: "800"
  },
  discoveryActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginTop: 20
  },
  roundAction: {
    width: 86,
    minHeight: 59,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
    shadowColor: colours.shadow,
    shadowOpacity: 0.09,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
  },
  passAction: {
    backgroundColor: colours.white,
    borderWidth: 1,
    borderColor: colours.border
  },
  likeAction: {
    backgroundColor: colours.coral
  },
  actionPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.75
  },
  passIcon: {
    color: colours.inkMuted,
    fontSize: 26,
    lineHeight: 28
  },
  likeIcon: {
    color: colours.white,
    fontSize: 24,
    lineHeight: 26
  },
  actionLabel: {
    color: colours.navy,
    fontSize: 12,
    fontWeight: "800"
  },
  likeActionLabel: {
    color: colours.white,
    fontSize: 12,
    fontWeight: "800"
  },
  remainingText: {
    color: colours.inkMuted,
    fontSize: 10,
    textAlign: "center",
    marginTop: 12
  },
  emptyCard: {
    alignItems: "center",
    padding: 28,
    borderRadius: 22,
    backgroundColor: colours.white,
    borderWidth: 1,
    borderColor: colours.border
  },
  emptyIcon: {
    color: colours.coral,
    fontSize: 45,
    marginBottom: 8
  },
  emptyTitle: {
    color: colours.navy,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center"
  },
  emptyBody: {
    color: colours.inkMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 7
  },
  safetyNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 15,
    borderRadius: 17,
    backgroundColor: colours.tealSoft,
    marginBottom: 14
  },
  safetyNoticeIcon: {
    color: colours.teal,
    fontSize: 26,
    fontWeight: "900"
  },
  safetyNoticeTitle: {
    color: colours.tealDark,
    fontSize: 13,
    fontWeight: "900"
  },
  safetyNoticeBody: {
    color: colours.tealDark,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2
  },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colours.border
  },
  matchRowPressed: {
    opacity: 0.55
  },
  matchCopy: {
    flex: 1
  },
  matchTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  matchName: {
    color: colours.navy,
    fontSize: 15,
    fontWeight: "900"
  },
  matchTime: {
    color: colours.inkMuted,
    fontSize: 10
  },
  matchPreview: {
    color: colours.inkMuted,
    fontSize: 12,
    marginTop: 4
  },
  unreadBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colours.coral
  },
  unreadText: {
    color: colours.white,
    fontSize: 10,
    fontWeight: "900"
  },
  chevron: {
    color: colours.inkMuted,
    fontSize: 26
  },
  postCard: {
    padding: 17,
    borderRadius: 21,
    backgroundColor: colours.white,
    borderWidth: 1,
    borderColor: colours.border,
    marginBottom: 12
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  postAvatar: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center"
  },
  postAvatarText: {
    color: colours.white,
    fontSize: 13,
    fontWeight: "900"
  },
  postAuthor: {
    color: colours.navy,
    fontSize: 13,
    fontWeight: "900"
  },
  postCategory: {
    color: colours.teal,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2
  },
  postMenu: {
    color: colours.inkMuted,
    letterSpacing: 2
  },
  postBody: {
    color: colours.navy,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 14
  },
  postFooter: {
    flexDirection: "row",
    gap: 9,
    marginTop: 15
  },
  postAction: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#F7F3ED"
  },
  postActionSelected: {
    backgroundColor: colours.coralSoft
  },
  postActionText: {
    color: colours.inkMuted,
    fontSize: 11,
    fontWeight: "700"
  },
  postActionTextSelected: {
    color: colours.coral
  },
  checkInCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 22
  },
  checkInTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16
  },
  checkInEyebrow: {
    color: "#BDE4DA",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4
  },
  checkInTitle: {
    color: colours.white,
    fontSize: 21,
    fontWeight: "900",
    marginTop: 5
  },
  checkInIcon: {
    color: colours.white,
    fontSize: 34,
    fontWeight: "900"
  },
  checkInBody: {
    color: "#E0F2ED",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 11,
    marginBottom: 16
  },
  checkInButton: {
    alignItems: "center",
    padding: 13,
    borderRadius: 14,
    backgroundColor: colours.white
  },
  checkInButtonText: {
    color: colours.tealDark,
    fontSize: 12,
    fontWeight: "900"
  },
  groupTitle: {
    color: colours.navy,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 5,
    marginBottom: 11
  },
  safetyGrid: {
    flexDirection: "row",
    gap: 11,
    marginBottom: 14
  },
  safetyActionCard: {
    flex: 1,
    minHeight: 174,
    padding: 15,
    borderRadius: 20,
    backgroundColor: colours.white,
    borderWidth: 1,
    borderColor: colours.border
  },
  safetyActionIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12
  },
  safetyActionTitle: {
    color: colours.navy,
    fontSize: 15,
    fontWeight: "900"
  },
  safetyActionBody: {
    color: colours.inkMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5
  },
  helpCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#FFF2D9"
  },
  helpIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: "hidden",
    color: colours.white,
    backgroundColor: colours.gold,
    textAlign: "center",
    lineHeight: 28,
    fontWeight: "900"
  },
  helpTitle: {
    color: colours.navy,
    fontSize: 13,
    fontWeight: "900"
  },
  helpBody: {
    color: colours.inkMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3
  },
  myProfileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 21,
    backgroundColor: colours.white,
    borderWidth: 1,
    borderColor: colours.border,
    marginBottom: 20
  },
  myAvatar: {
    width: 68,
    height: 68,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center"
  },
  myAvatarText: {
    color: colours.white,
    fontSize: 21,
    fontWeight: "900"
  },
  myName: {
    color: colours.navy,
    fontSize: 18,
    fontWeight: "900"
  },
  myMeta: {
    color: colours.inkMuted,
    fontSize: 11,
    marginTop: 3
  },
  profileComplete: {
    color: colours.success,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 6
  },
  settingsCard: {
    borderRadius: 20,
    backgroundColor: colours.white,
    borderWidth: 1,
    borderColor: colours.border,
    marginBottom: 20,
    overflow: "hidden"
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16
  },
  settingCopy: {
    flex: 1
  },
  settingTitle: {
    color: colours.navy,
    fontSize: 13,
    fontWeight: "900"
  },
  settingBody: {
    color: colours.inkMuted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4
  },
  settingsDivider: {
    height: 1,
    marginLeft: 16,
    backgroundColor: colours.border
  },
  demoInformation: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: colours.lavender,
    marginTop: 20,
    marginBottom: 14
  },
  demoInformationTitle: {
    color: colours.lavenderDark,
    fontSize: 13,
    fontWeight: "900"
  },
  demoInformationBody: {
    color: colours.lavenderDark,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4
  },
  bottomNav: {
    flexDirection: "row",
    paddingTop: 9,
    paddingBottom: Platform.OS === "ios" ? 4 : 10,
    borderTopWidth: 1,
    borderTopColor: colours.border,
    backgroundColor: colours.white
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    gap: 2
  },
  navIcon: {
    color: "#879299",
    fontSize: 21,
    lineHeight: 23,
    fontWeight: "800"
  },
  navIconActive: {
    color: colours.teal
  },
  navLabel: {
    color: "#879299",
    fontSize: 8,
    fontWeight: "700"
  },
  navLabelActive: {
    color: colours.teal,
    fontWeight: "900"
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: colours.border
  },
  modalTitle: {
    color: colours.navy,
    fontSize: 18,
    fontWeight: "900"
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2EEE8"
  },
  closeButtonText: {
    color: colours.navy,
    fontSize: 25,
    lineHeight: 28
  },
  modalContent: {
    padding: 18,
    paddingBottom: 34
  },
  modalProfileName: {
    color: colours.navy,
    fontSize: 29,
    fontWeight: "900",
    marginTop: 18
  },
  modalBio: {
    color: colours.navy,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 18,
    marginBottom: 15
  },
  privacyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colours.tealSoft,
    marginTop: 20,
    marginBottom: 17
  },
  privacyCardIcon: {
    color: colours.teal,
    fontSize: 22
  },
  privacyCardTitle: {
    color: colours.tealDark,
    fontSize: 13,
    fontWeight: "900"
  },
  privacyCardBody: {
    color: colours.tealDark,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 3
  },
  matchModalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
    backgroundColor: "rgba(10,28,36,0.72)"
  },
  matchModalCard: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    padding: 24,
    borderRadius: 28,
    backgroundColor: colours.cream
  },
  matchModalHeart: {
    color: colours.coral,
    fontSize: 58,
    lineHeight: 62
  },
  matchModalEyebrow: {
    color: colours.coral,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.8,
    marginTop: 2
  },
  matchModalTitle: {
    color: colours.navy,
    fontSize: 26,
    lineHeight: 31,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 7
  },
  matchModalBody: {
    color: colours.inkMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 9,
    marginBottom: 18
  },
  matchFaces: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20
  },
  matchFace: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  matchFaceText: {
    color: colours.white,
    fontSize: 20,
    fontWeight: "900"
  },
  chatSafeArea: {
    flex: 1,
    backgroundColor: "#F8F4EE"
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colours.white,
    borderBottomWidth: 1,
    borderBottomColor: colours.border
  },
  chatBack: {
    width: 32,
    alignItems: "center",
    justifyContent: "center"
  },
  chatBackText: {
    color: colours.navy,
    fontSize: 34,
    lineHeight: 36
  },
  chatName: {
    color: colours.navy,
    fontSize: 14,
    fontWeight: "900"
  },
  chatStatus: {
    color: colours.inkMuted,
    fontSize: 9,
    marginTop: 2
  },
  chatSafety: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colours.tealSoft
  },
  chatSafetyText: {
    color: colours.teal,
    fontSize: 21,
    fontWeight: "900"
  },
  chatPrivacy: {
    alignItems: "center",
    paddingVertical: 7,
    backgroundColor: colours.lavender
  },
  chatPrivacyText: {
    color: colours.lavenderDark,
    fontSize: 9,
    fontWeight: "700"
  },
  chatMessages: {
    flexGrow: 1,
    padding: 16
  },
  chatDay: {
    color: colours.inkMuted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.1,
    textAlign: "center",
    marginBottom: 12
  },
  messageBubble: {
    maxWidth: "82%",
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 17,
    marginBottom: 9
  },
  theirMessage: {
    alignSelf: "flex-start",
    backgroundColor: colours.white,
    borderBottomLeftRadius: 5
  },
  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: colours.teal,
    borderBottomRightRadius: 5
  },
  messageText: {
    color: colours.navy,
    fontSize: 13,
    lineHeight: 19
  },
  myMessageText: {
    color: colours.white
  },
  messageTime: {
    color: colours.inkMuted,
    fontSize: 8,
    textAlign: "right",
    marginTop: 4
  },
  myMessageTime: {
    color: "#BDE4DA"
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colours.border,
    backgroundColor: colours.white
  },
  composerInput: {
    flex: 1,
    minHeight: 45,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 17,
    color: colours.navy,
    backgroundColor: "#F5F1EB",
    fontSize: 13
  },
  sendButton: {
    width: 45,
    height: 45,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colours.teal
  },
  sendButtonMuted: {
    opacity: 0.45
  },
  sendButtonText: {
    color: colours.white,
    fontSize: 21,
    fontWeight: "900"
  }
});
