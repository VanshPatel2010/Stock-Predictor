from pathlib import Path

import torch

from ml.lstm_model import StockLSTM


def main() -> None:
    model = StockLSTM()
    output_path = Path(__file__).with_name("model.pt")
    torch.save(model.state_dict(), output_path)
    print(f"Saved placeholder weights to {output_path}")


if __name__ == "__main__":
    main()

