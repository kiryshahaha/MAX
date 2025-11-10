"use client";
import { Avatar, Flex, Panel, Typography } from "@maxhub/max-ui";
import React from "react";
import { useParams } from "next/navigation";

const { Headline } = Typography;

export default function ProfilePage() {
  const { id } = useParams();

  return (
    <Panel mode="secondary">
      <Flex direction="column" gap={20} align="center" className="wrap">
        <Avatar.Container size={120}>
          <Avatar.Image
            alt={`Профиль пользователя ${id}`}
            fallback={id?.slice(0, 2)?.toUpperCase() || "??"}
            fallbackGradient="purple"
            src={`https://pro.guap.ru/avatars/50/${id}.JPG`}
          />
        </Avatar.Container>
        <Headline>{`Профиль пользователя: ${id}`}</Headline>
      </Flex>
    </Panel>
  );
}
