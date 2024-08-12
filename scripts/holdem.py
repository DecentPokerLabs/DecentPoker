import random
from collections import Counter
from itertools import combinations

class Card:
    suits = ['♥', '♦', '♣', '♠']
    values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
    
    def __init__(self, value, suit):
        self.value = value
        self.suit = suit

    def __repr__(self):
        return f'{self.value}{self.suit}'

class Deck:
    def __init__(self):
        self.cards = [Card(value, suit) for suit in Card.suits for value in Card.values]
        self.shuffle()

    def shuffle(self):
        random.shuffle(self.cards)

    def draw_card(self):
        if not self.cards:
            raise ValueError("Deck is empty")
        return self.cards.pop()

class Player:
    def __init__(self, name, balance):
        self.name = name
        self.hand = []
        self.balance = balance
        self.is_active = True

    def receive_card(self, card):
        self.hand.append(card)

    def clear_hand(self):
        self.hand.clear()

    def bet(self, amount):
        if amount <= self.balance:
            self.balance -= amount
            return amount
        raise ValueError("Insufficient balance")

class PokerHandEvaluator:
    hand_rankings = ['High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush', 'Royal Flush']

    @staticmethod
    def evaluate_hand(hand):
        values = [card.value for card in hand]
        suits = [card.suit for card in hand]
        value_counts = Counter(values)
        
        is_flush = len(set(suits)) == 1
        is_straight = PokerHandEvaluator.is_straight(values)
        sorted_values = sorted(values, key=lambda x: Card.values.index(x), reverse=True)
        
        if is_flush and is_straight:
            if sorted_values[0] == 'A':
                return 'Royal Flush', sorted_values
            return 'Straight Flush', sorted_values
        if 4 in value_counts.values():
            return 'Four of a Kind', sorted_values
        if 3 in value_counts.values() and 2 in value_counts.values():
            return 'Full House', sorted_values
        if is_flush:
            return 'Flush', sorted_values
        if is_straight:
            return 'Straight', sorted_values
        if 3 in value_counts.values():
            return 'Three of a Kind', sorted_values
        if list(value_counts.values()).count(2) == 2:
            return 'Two Pair', sorted_values
        if 2 in value_counts.values():
            return 'Pair', sorted_values
        return 'High Card', sorted_values

    @staticmethod
    def is_straight(values):
        value_indices = [Card.values.index(v) for v in values]
        value_range = max(value_indices) - min(value_indices)
        if len(set(value_indices)) == 5 and value_range == 4:
            return True
        if set(values) == {'A', '2', '3', '4', '5'}:
            return True
        return False

    @staticmethod
    def best_hand(player_hand, community_cards):
        return max((PokerHandEvaluator.evaluate_hand(hand) for hand in combinations(player_hand + community_cards, 5)),
                   key=lambda x: (PokerHandEvaluator.hand_rankings.index(x[0]), x[1]))

class PokerGame:
    def __init__(self, player_names, starting_balance=1000, small_blind=10, big_blind=20):
        self.deck = Deck()
        self.players = [Player(name.strip(), starting_balance) for name in player_names]
        self.community_cards = []
        self.pot = 0
        self.current_bet = 0
        self.small_blind = small_blind
        self.big_blind = big_blind
        self.dealer_index = 0

    def deal(self):
        self.deck.shuffle()
        for _ in range(2):
            for player in self.players:
                if player.is_active:
                    player.receive_card(self.deck.draw_card())

    def post_blinds(self):
        small_blind_index = (self.dealer_index + 1) % len(self.players)
        big_blind_index = (self.dealer_index + 2) % len(self.players)

        self.place_bet(self.players[small_blind_index], self.small_blind)
        self.place_bet(self.players[big_blind_index], self.big_blind)
        self.current_bet = self.big_blind

    def flop(self):
        self.community_cards.extend([self.deck.draw_card() for _ in range(3)])

    def turn(self):
        self.community_cards.append(self.deck.draw_card())

    def river(self):
        self.community_cards.append(self.deck.draw_card())

    def place_bet(self, player, amount):
        bet = player.bet(amount)
        self.pot += bet
        self.current_bet = max(self.current_bet, bet)

    def betting_round(self):
        active_players = [player for player in self.players if player.is_active]
        for player in active_players:
            self.player_action(player)

    def player_action(self, player):
        while True:
            try:
                print(f'\n{player.name}, your hand: {player.hand} | Community Cards: {self.community_cards}')
                print(f'Your balance: {player.balance} | Current bet: {self.current_bet} | Pot: {self.pot}')
                action = input("Do you want to fold, call, or raise? (f/c/r): ").lower()
                if action == 'f':
                    player.is_active = False
                    break
                elif action == 'c':
                    self.place_bet(player, self.current_bet)
                    break
                elif action == 'r':
                    raise_amount = int(input("Enter raise amount: "))
                    if raise_amount <= player.balance and raise_amount > self.current_bet:
                        self.place_bet(player, raise_amount)
                        break
                    else:
                        print("Invalid raise amount. Please try again.")
                else:
                    print("Invalid action. Please choose 'f', 'c', or 'r'.")
            except ValueError:
                print("Invalid input. Please enter a number for raise amount.")

    def determine_winner(self):
        active_players = [player for player in self.players if player.is_active]
        if len(active_players) == 1:
            winner = active_players[0]
            winner.balance += self.pot
            print(f'{winner.name} wins the pot of {self.pot}!')
        else:
            best_hands = {player: PokerHandEvaluator.best_hand(player.hand, self.community_cards) for player in active_players}
            winners = [player for player, hand in best_hands.items() if hand == max(best_hands.values(), key=lambda x: (PokerHandEvaluator.hand_rankings.index(x[0]), x[1]))]
            
            pot_share = self.pot // len(winners)
            for winner in winners:
                winner.balance += pot_share
                print(f'{winner.name} wins {pot_share} with {best_hands[winner][0]}!')

    def play_round(self):
        self.deal()
        self.post_blinds()
        self.betting_round()

        for street in [self.flop, self.turn, self.river]:
            if sum(player.is_active for player in self.players) > 1:
                street()
                self.betting_round()

        self.determine_winner()

        # Reset for next round
        self.community_cards.clear()
        self.pot = 0
        self.current_bet = 0
        for player in self.players:
            player.clear_hand()
            player.is_active = True
        self.dealer_index = (self.dealer_index + 1) % len(self.players)

    def play_game(self):
        while len([player for player in self.players if player.balance > 0]) > 1:
            print("\n--- New Round ---")
            self.play_round()
            
            # Display current standings
            print("\nCurrent standings:")
            for player in self.players:
                print(f"{player.name}: ${player.balance}")

            play_again = input("Play another round? (y/n): ").lower()
            if play_again != 'y':
                break

        print("\nGame Over!")
        for player in self.players:
            print(f"{player.name} finished with ${player.balance}")

def main():
    player_names = input("Enter player names separated by commas: ").split(',')
    game = PokerGame(player_names)
    game.play_game()

if __name__ == "__main__":
    main()