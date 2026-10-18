<!-- version v1.0 -->
# Xì dách

Một người đấu nhà cái máy, chơi từng ván bằng bộ bài 52 lá mới. Không có cược tiền, mua vật phẩm, chia bài đôi hoặc bảo hiểm. Mở `#play/xidach` trong thư viện Trạm Chơi.

## Luật của bàn này

- Mỗi bên nhận hai lá; lá thứ hai của nhà cái được úp đến lượt nhà cái hoặc khi kết thúc ván.
- Lá 2–10 tính đúng số; J, Q, K tính 10. Mỗi A có thể tính 1, 10 hoặc 11. Game xét mọi tổng và chọn tổng cao nhất không vượt 21 cho bài thường.
- Thứ hạng: **Xì bàn** (hai A) > **Xì dách** (A và 10/J/Q/K) > **Ngũ linh** (năm lá không quá 21) > **bài thường** (16–21 điểm).
- Với Ngũ linh, tổng nhỏ hơn thắng. Khi có A, dùng tổng hợp lệ nhỏ nhất. Với bài thường, tổng lớn hơn thắng. Cùng hạng đặc biệt hai lá, hoặc cùng hạng và điểm của các bài khác, thì hòa; không xét chất bài.
- Có Xì bàn hoặc Xì dách ngay sau chia thì so bài và kết thúc ngay.
- Người chơi chỉ được dừng từ 16 điểm. Đủ 21 hoặc đủ năm lá sẽ tự dừng. Người chơi quắc (mọi cách tính đều vượt 21) thì thua ngay; nhà cái không cần rút thêm.
- Nhà cái rút khi dưới 17, dừng từ 17 kể cả 17 có A, và không rút lá thứ sáu. Chính sách chỉ đọc bài nhà cái, không nhìn bài người chơi để quyết định.
- Mỗi ván thắng cộng 100 điểm vào tổng phiên; hòa hoặc thua không cộng, không trừ. Kỷ lục lưu tổng điểm phiên qua cơ chế chung của thư viện. Bộ đếm thắng/ván giữ khi chia ván mới hoặc dùng nút chơi lại; đóng game sẽ kết thúc phiên.

Xì dách có nhiều biến thể. Tham khảo mô tả của [VinaGames](https://vina.vinagames.com/vi/blackjack.php) cho cách tính A, thứ hạng và ngưỡng dừng. Bàn này chọn **Ngũ linh không quá 21**, quy tắc dừng nhà cái cố định và hòa giữ nguyên, như ghi rõ trên giao diện; không mô phỏng tất cả biến thể xét bài hoặc ăn tiền.

## Cấu trúc và kiểm thử

- `games/xidach-logic.js`: UMD `ArcadeXiDach` trên trình duyệt, `module.exports` trong Node. Các hàm `createDeck`, `createGame({ random })`, `evaluate`, `compareHands`, `hit`, `stand`, `dealerStep`, `canHit`, `canStand`, `publicState`.
- Trạng thái có `hands.player`, `hands.dealer`, `deck`, `phase` (`player`, `dealer`, `done`), `outcome` (`win`, `loss`, `push` hoặc `null`), `reason`, `score`. Hành động trả `{ ok, ... }`; hành động không hợp lệ không sửa trạng thái. `score` là điểm riêng ván; UI cộng điểm thắng của phiên để báo kỷ lục.
- `publicState` không trả bộ bài úp, che lá thứ hai nhà cái bằng `null` và không tính điểm nhà cái trong lượt người chơi. UI chỉ dựng nội dung lá từ view này, không giấu mặt bài bằng CSS.
- `games/xidach.js` và `games/xidach.css`: bài bằng HTML/CSS, điều khiển nút chạm và bàn phím thông qua button chuẩn. Chờ nhà cái dùng `ArcadeShared.createScope().after`; tạm dừng bảo toàn thời gian, chơi lại xóa timer cũ, đóng hủy lifecycle.
- Selector kiểm thử: `.xidach-workspace[data-phase]`, `[data-xidach-hit]`, `[data-xidach-stand]`, `[data-xidach-next]`, `[data-xidach-hand="player"]`, `[data-xidach-hand="dealer"]`, `[data-xidach-value="player"]`, `[data-xidach-phase]`, `[data-xidach-result][data-outcome]`.
- Chạy `node --test tests/xidach.test.cjs`. Bộ kiểm thử xét nhiều A, thứ hạng, Ngũ linh, hòa, bài tự nhiên khi chia, hành động sai, quắc, giới hạn năm lá, chính sách nhà cái, bảo mật view, bảo toàn 52 lá và 1.000 ván có seed.
