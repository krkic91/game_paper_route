<!-- version v1.0 -->
# Mở rộng thư viện: 5 game bàn và bài

## Phạm vi đã chọn

Thêm Domino, Cờ tỷ phú, Tiến lên miền Nam, Xì dách và Ma sói vào thư viện hiện có.
Mỗi game có một sub-agent phụ trách luật, giao diện, kiểm thử đơn vị và tài liệu.
Agent chính tích hợp thư viện, hình minh họa, kiểm tra vòng đời và giao diện trình duyệt.
Tối đa ba sub-agent chạy đồng thời; các công việc còn lại vào đợt tiếp theo.

Người dùng đã chọn **Ma sói một người đấu máy**. Các game còn lại cũng ưu tiên
chơi ngay với máy, giao diện 2D tiếng Việt, điều khiển chuột/cảm ứng/bàn phím.
Tiền trong Cờ tỷ phú là tài nguyên của ván chơi; các game bài dùng điểm giải trí.

| Agent | Game / id | Phạm vi bản đầu |
| --- | --- | --- |
| `domino_game` | Domino / `domino` | Double-six 28 quân; bạn + 3 máy; nối hai đầu, bỏ lượt khi bí; tính thắng khi hết quân hoặc khóa bàn. |
| `monopoly_game` | Cờ tỷ phú / `monopoly` | Bàn 24 ô, bạn + 3 máy; mua đất, thuê, nâng cấp, thuế/cơ hội, tạm giữ, phá sản; tối đa 30 vòng. |
| `tienlen_game` | Tiến lên miền Nam / `tienlen` | 52 lá, bạn + 3 máy; bộ bài hợp lệ, sảnh, đôi thông, chặt heo, bỏ vòng; người hết bài đầu tiên thắng. |
| `xidach_game` | Xì dách / `xidach` | Bạn đấu nhà cái máy; rút/dằn, xì bàn, xì dách, ngũ linh, quắc; quy ước Át và hòa được ghi rõ. |
| `werewolf_game` | Ma sói / `werewolf` | Bạn + 7 máy; vai bí mật, đêm/ngày, soi/bảo vệ/tấn công, thảo luận theo thông tin của bot, bỏ phiếu và thắng theo phe. |

## Hợp đồng tích hợp

- Mỗi game chỉ sở hữu `games/<id>-logic.js`, `games/<id>.js`, `games/<id>.css`,
  `tests/<id>.test.cjs` và `docs/<id>.md`; không tự sửa file dùng chung.
- Luật độc lập DOM, xuất UMD cho trình duyệt và Node. Giao diện đăng ký
  `window.ArcadeGames[id]`, dùng `ArcadeShared` cho sự kiện và bộ hẹn giờ.
- Tạm dừng giữ nguyên lượt; chơi lại hủy mọi lượt máy cũ; đóng game hủy sự kiện/timer.
- Các bản rút gọn ghi rõ quy ước, không nhận là toàn bộ luật của mọi biến thể.
- Bot chỉ dùng bài/vai được phép biết và thông tin công khai. Giao diện không đưa
  thông tin bí mật của đối thủ vào nhãn hoặc nội dung ẩn trên DOM.
- Giữ nguyên các thay đổi UNO đã hoàn thành và nội dung người dùng đang sửa.

## Tiêu chí hoàn thành

- Chơi được một ván từ đầu đến kết quả, có chơi lại và hướng dẫn ngay trong game.
- Kiểm thử luật bao gồm thao tác sai, chuyển lượt, bảo toàn bộ bài/quân, thắng/thua,
  và ván máy tự động kết thúc; có tình huống đặc biệt của từng game.
- Thư viện có đủ 20 game, tìm kiếm/lọc/mở liên kết trực tiếp và ảnh minh họa riêng.
- Kiểm tra Chromium/WebKit ở cỡ điện thoại, iPad và máy tính; thử tay bài đông,
  tạm dừng, chơi lại, đóng/mở và thao tác chạm. Đây là mô phỏng trên Windows,
  không phải thử trên thiết bị iOS thật.

Chi tiết môi trường, phạm vi và cách chạy lại được ghi trong
[báo cáo kiểm thử năm game](table-games-testing.md).

## Hoàn thành ngày 18/10/2026

Đủ năm game trong thư viện 20 game, có hướng dẫn và kết quả/chơi lại.
72 kiểm thử luật đạt, gồm 2.200 ván tự động; 52 trường hợp trình duyệt đạt
trên Chromium/WebKit. Đã sửa lỗi nội dung bàn che điều khiển ở Xì dách và
Cờ tỷ phú, rồi kiểm tra lại cả hai engine. UNO và vòng đời chung cũng đã
qua kiểm tra hồi quy. Đây là các bản chơi với máy theo phạm vi đã chọn.
