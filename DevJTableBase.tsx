# jednorazowo, jeśli nie masz:
# install.packages(c("leaflet", "htmlwidgets"))

library(leaflet)
library(htmlwidgets)

# 1. Wczytaj dane z CSV
d <- read.csv2("dane_output.csv", stringsAsFactors = FALSE)

# 2. Upewnij się, że lat/lon to liczby
d$lat <- as.numeric(gsub(",", ".", as.character(d$lat)))
d$lon <- as.numeric(gsub(",", ".", as.character(d$lon)))

# (opcjonalnie sprawdź)
# head(d[, c("lat", "lon")])

# 3. Zrób mapę
m <- leaflet(d) %>%
  addTiles() %>%
  addCircleMarkers(
    lng = ~lon,
    lat = ~lat,
    radius = 6,
    color = "red",
    fillOpacity = 0.8,
    popup = ~paste0(
      "SU: ", SU, "<br>",
      "SU_Netto: ", SU_Netto, "<br>",
      "adres: ", adres
    )
  ) %>%
  setView(lng = 19, lat = 52, zoom = 6)

# 4. Zapisz do HTML
saveWidget(m, "mapa.html", selfcontained = TRUE)
